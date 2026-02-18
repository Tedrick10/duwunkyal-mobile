import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  LogBox,
  PanResponder,
} from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadTextureAsync } from "expo-three";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type Props = {
  tshirtColor: string;
  objUri: string | null;
  objReady?: boolean;
  compact?: boolean;
  /** When false, renders a single frame (no animation loop). */
  active?: boolean;
  frontDesignTextureUri?: string | null;
  frontDesignTextureVersion?: number;
  backDesignTextureUri?: string | null;
  backDesignTextureVersion?: number;
};

const ROTATION_SPEED = 0.008;
const COMPACT_SIZE = 80;

let objCache: { uri: string; group: THREE.Group } | null = null;

/** Add planar XY UVs to geometry if it has no UVs (OBJ without vt). Needed for texture to show. */
function ensureGeometryUVs(geometry: THREE.BufferGeometry): void {
  if (geometry.attributes.uv) return;
  const pos = geometry.attributes.position;
  if (!pos) return;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);
  const box = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
  const min = box.min;
  const size = new THREE.Vector3().subVectors(box.max, box.min);
  if (size.x < 1e-6) size.x = 1;
  if (size.y < 1e-6) size.y = 1;
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs[i * 2] = (x - min.x) / size.x;
    uvs[i * 2 + 1] = (y - min.y) / size.y;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function addObjToScene(
  obj: THREE.Group,
  scene: THREE.Scene,
  material: THREE.Material
) {
  obj.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) ensureGeometryUVs(mesh.geometry);
      mesh.material = material as any;
    }
  });
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.0 / maxDim;
  obj.scale.setScalar(scale);
  obj.position.sub(center.multiplyScalar(scale));
  scene.add(obj);
}

function splitGeometryFrontBackByZ(geometry: THREE.BufferGeometry): {
  front: THREE.BufferGeometry | null;
  back: THREE.BufferGeometry | null;
} {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!posAttr) return { front: null, back: null };
  const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute | undefined;
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;

  // Compute mid Z for front/back split (local space).
  const box = new THREE.Box3().setFromBufferAttribute(posAttr);
  const midZ = (box.min.z + box.max.z) / 2;

  const indexAttr = geometry.getIndex();
  const indices: ArrayLike<number> = indexAttr ? indexAttr.array : (Array.from({ length: posAttr.count }, (_, i) => i) as number[]);
  const triCount = Math.floor(indices.length / 3);

  const frontIdx: number[] = [];
  const backIdx: number[] = [];

  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3]!;
    const b = indices[t * 3 + 1]!;
    const c = indices[t * 3 + 2]!;
    const avgZ = (posAttr.getZ(a) + posAttr.getZ(b) + posAttr.getZ(c)) / 3;
    const target = avgZ >= midZ ? frontIdx : backIdx;
    target.push(a, b, c);
  }

  const mk = (idx: number[]): THREE.BufferGeometry | null => {
    if (!idx.length) return null;
    const out = new THREE.BufferGeometry();
    // Share attributes (no large copies).
    out.setAttribute("position", posAttr);
    if (uvAttr) out.setAttribute("uv", uvAttr);
    if (normalAttr) out.setAttribute("normal", normalAttr);
    out.setIndex(idx);
    out.computeBoundingSphere();
    return out;
  };

  return { front: mk(frontIdx), back: mk(backIdx) };
}

function createDecalMesh(
  baseMesh: THREE.Mesh,
  geometry: THREE.BufferGeometry,
  material: THREE.Material
): THREE.Mesh {
  const decal = new THREE.Mesh(geometry, material);
  decal.position.copy(baseMesh.position);
  decal.quaternion.copy(baseMesh.quaternion);
  decal.scale.copy(baseMesh.scale);
  decal.matrixAutoUpdate = baseMesh.matrixAutoUpdate;
  if (!decal.matrixAutoUpdate) decal.matrix.copy(baseMesh.matrix);
  // Draw after base shirt.
  decal.renderOrder = 2;
  return decal;
}

export function Preview3D({
  tshirtColor,
  objUri,
  objReady = true,
  compact = false,
  active = !compact,
  frontDesignTextureUri = null,
  frontDesignTextureVersion = 0,
  backDesignTextureUri = null,
  backDesignTextureVersion = 0,
}: Props) {
  const animRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const prevPanRef = useRef({ x: 0, y: 0 });
  const baseMaterialRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const frontDecalMaterialRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const backDecalMaterialRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const decalMeshesRef = useRef<THREE.Mesh[]>([]);
  const activeRef = useRef(active);
  const renderFrameRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const pendingRafRef = useRef<number | null>(null);
  const tshirtColorRef = useRef(tshirtColor);
  tshirtColorRef.current = tshirtColor;
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    activeRef.current = active;
    // When switching to inactive, render once to settle.
    if (!active) renderFrameRef.current?.();
  }, [active]);

  useEffect(() => () => {
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    if (pendingRafRef.current != null) cancelAnimationFrame(pendingRafRef.current);
    baseMaterialRef.current = null;
    frontDecalMaterialRef.current = null;
    backDecalMaterialRef.current = null;
    decalMeshesRef.current = [];
    renderFrameRef.current = null;
    requestRenderRef.current = null;
  }, []);

  useEffect(() => {
    LogBox.ignoreLogs(["EXGL: gl.pixelStorei"]);
  }, []);

  useEffect(() => {
    // Base shirt color always comes from tshirtColor.
    if (baseMaterialRef.current) {
      baseMaterialRef.current.color.setStyle(tshirtColor);
      baseMaterialRef.current.needsUpdate = true;
      requestRenderRef.current?.();
    }
  }, [tshirtColor]);

  useEffect(() => {
    if (!modelReady) return;
    // Ensure base color is synced after GL init.
    if (baseMaterialRef.current) {
      baseMaterialRef.current.color.setStyle(tshirtColor);
      baseMaterialRef.current.needsUpdate = true;
      requestRenderRef.current?.();
    }
  }, [modelReady, tshirtColor]);

  // Full-screen: force color sync one frame after GL is ready (avoids stale ref on first paint)
  useEffect(() => {
    if (compact || !modelReady || !baseMaterialRef.current) return;
    const id = requestAnimationFrame(() => {
      if (baseMaterialRef.current) baseMaterialRef.current.color.setStyle(tshirtColor);
    });
    return () => cancelAnimationFrame(id);
  }, [compact, modelReady, tshirtColor]);

  useEffect(() => {
    if (!modelReady || !frontDecalMaterialRef.current) return;
    let cancelled = false;

    const applyNone = () => {
      const mat = frontDecalMaterialRef.current;
      if (!mat) return;
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
      }
      mat.opacity = 0;
      mat.needsUpdate = true;
    };

    if (!frontDesignTextureUri) {
      applyNone();
      return;
    }

    const textureAsset = Asset.fromURI(frontDesignTextureUri);
    textureAsset
      .downloadAsync()
      .then(() => loadTextureAsync({ asset: textureAsset }))
      .then((tex: THREE.Texture) => {
        const mat = frontDecalMaterialRef.current;
        if (cancelled || !mat) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.opacity = 1;
        mat.needsUpdate = true;
        requestRenderRef.current?.();
      })
      .catch(() => {
        if (!cancelled) applyNone();
      });
    return () => {
      cancelled = true;
      // Don't dispose here; next effect run will manage it.
    };
  }, [frontDesignTextureUri, frontDesignTextureVersion, modelReady]);

  useEffect(() => {
    if (!modelReady || !backDecalMaterialRef.current) return;
    let cancelled = false;

    const applyNone = () => {
      const mat = backDecalMaterialRef.current;
      if (!mat) return;
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
      }
      mat.opacity = 0;
      mat.needsUpdate = true;
    };

    if (!backDesignTextureUri) {
      applyNone();
      return;
    }

    const textureAsset = Asset.fromURI(backDesignTextureUri);
    textureAsset
      .downloadAsync()
      .then(() => loadTextureAsync({ asset: textureAsset }))
      .then((tex: THREE.Texture) => {
        const mat = backDecalMaterialRef.current;
        if (cancelled || !mat) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        // Flip horizontally so back text/images are not mirrored.
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.x = -1;
        tex.offset.x = 1;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.opacity = 1;
        mat.needsUpdate = true;
        requestRenderRef.current?.();
      })
      .catch(() => {
        if (!cancelled) applyNone();
      });

    return () => {
      cancelled = true;
    };
  }, [backDesignTextureUri, backDesignTextureVersion, modelReady]);

  useEffect(() => {
    if (objUri) setModelReady(false);
  }, [objUri]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const e = evt as unknown as { nativeEvent: { pageX: number; pageY: number } };
          const { pageX, pageY } = e.nativeEvent;
          prevPanRef.current = { x: pageX, y: pageY };
        },
        onPanResponderMove: (evt) => {
          const e = evt as unknown as { nativeEvent: { pageX: number; pageY: number } };
          const { pageX, pageY } = e.nativeEvent;
          const prev = prevPanRef.current;
          const dx = pageX - prev.x;
          const dy = pageY - prev.y;
          prevPanRef.current = { x: pageX, y: pageY };
          rotationRef.current.y += dx * ROTATION_SPEED;
          rotationRef.current.x -= dy * ROTATION_SPEED;
          requestRenderRef.current?.();
        },
      }),
    []
  );

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const initialColor = tshirtColorRef.current;
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new Renderer({
      gl,
      // Antialias is expensive on mobile; keep it off for smoother interaction.
      antialias: false,
      width,
      height,
      // Cap pixel ratio hard to reduce GPU load.
      pixelRatio: 1,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    // Use Lambert for better mobile performance (cheaper than Standard/PBR).
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(initialColor),
      side: THREE.FrontSide,
    });
    baseMaterialRef.current = material;

    const frontDecalMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#ffffff"),
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      alphaTest: 0.01,
    });
    frontDecalMaterialRef.current = frontDecalMat;

    const backDecalMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#ffffff"),
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      alphaTest: 0.01,
    });
    backDecalMaterialRef.current = backDecalMat;

    let mesh: THREE.Object3D | null = null;
    let rootObj: THREE.Group | null = null;

    if (objUri) {
      try {
        if (objCache && objCache.uri === objUri) {
          const clone = objCache.group.clone();
          rootObj = clone;
          clone.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
          });
          addObjToScene(clone, scene, material);
        } else {
          const loader = new OBJLoader();
          let objText: string;
          const isRemote = objUri.startsWith("http://") || objUri.startsWith("https://");
          if (isRemote) {
            const res = await fetch(objUri);
            if (!res.ok) throw new Error("OBJ fetch failed");
            objText = await res.text();
          } else {
            objText = await FileSystem.readAsStringAsync(objUri, {
              encoding: "utf8",
            });
          }
          const obj = loader.parse(objText);
          rootObj = obj;
          obj.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
          });
          addObjToScene(obj, scene, material);
          objCache = { uri: objUri, group: obj };
        }
      } catch {
        const geo = new THREE.BoxGeometry(1, 1.2, 0.4);
        mesh = new THREE.Mesh(geo, material);
        scene.add(mesh);
      }
    } else {
      const geo = new THREE.BoxGeometry(1, 1.2, 0.4);
      mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);
    }

    // Add decal overlay meshes (front/back) so designs only show on correct side.
    const decalMeshes: THREE.Mesh[] = [];
    if (rootObj) {
      rootObj.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const baseMesh = child as THREE.Mesh;
          if (baseMesh.geometry) ensureGeometryUVs(baseMesh.geometry);
          const split = splitGeometryFrontBackByZ(baseMesh.geometry);
          const parent = baseMesh.parent;
          if (!parent) return;
          if (split.front) {
            const frontDecal = createDecalMesh(baseMesh, split.front, frontDecalMat);
            parent.add(frontDecal);
            decalMeshes.push(frontDecal);
          }
          if (split.back) {
            const backDecal = createDecalMesh(baseMesh, split.back, backDecalMat);
            parent.add(backDecal);
            decalMeshes.push(backDecal);
          }
        }
      });
    } else if (mesh && (mesh as THREE.Mesh).isMesh) {
      const baseMesh = mesh as THREE.Mesh;
      if (baseMesh.geometry) ensureGeometryUVs(baseMesh.geometry);
      const split = splitGeometryFrontBackByZ(baseMesh.geometry);
      if (split.front) {
        const frontDecal = createDecalMesh(baseMesh, split.front, frontDecalMat);
        scene.add(frontDecal);
        decalMeshes.push(frontDecal);
      }
      if (split.back) {
        const backDecal = createDecalMesh(baseMesh, split.back, backDecalMat);
        scene.add(backDecal);
        decalMeshes.push(backDecal);
      }
    }
    decalMeshesRef.current = decalMeshes;

    material.color.setStyle(initialColor);
    setModelReady(true);

    const renderFrame = () => {
      const { x, y } = rotationRef.current;
      if (rootObj) {
        rootObj.rotation.x = x;
        rootObj.rotation.y = y;
      } else if (mesh) {
        mesh.rotation.x = x;
        mesh.rotation.y = y;
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    renderFrameRef.current = renderFrame;

    const requestRender = () => {
      if (!activeRef.current) return;
      if (pendingRafRef.current != null) return;
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        renderFrameRef.current?.();
      });
    };
    requestRenderRef.current = requestRender;

    // Render once immediately.
    renderFrame();

  };

  if (compact) {
    return (
      <View style={[styles.container, styles.containerCompact]} collapsable={false}>
        {objUri && !modelReady ? (
          <View style={styles.loadingWrapCompact}>
            <ActivityIndicator size="small" color="#e94560" />
          </View>
        ) : null}
        <GLView
          key={objUri ?? "no-obj"}
          style={styles.glCompact}
          onContextCreate={onContextCreate}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>3D Preview</Text>
      {!objUri ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>
            {objReady ? "Model not available" : "Loading model…"}
          </Text>
        </View>
      ) : null}
      {objUri && !modelReady ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Loading 3D model…</Text>
        </View>
      ) : null}
      <View style={styles.gl} collapsable={false}>
        <GLView
          key={objUri ?? "no-obj"}
          style={StyleSheet.absoluteFill}
          onContextCreate={onContextCreate}
        />
        <View
          style={styles.gestureOverlay}
          {...panResponder.panHandlers}
          pointerEvents="box-only"
        />
      </View>
      <Text style={styles.hint}>Drag to rotate 360°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  containerCompact: {
    width: COMPACT_SIZE,
    height: COMPACT_SIZE,
    flex: undefined,
  },
  glCompact: {
    width: COMPACT_SIZE,
    height: COMPACT_SIZE,
  },
  loadingWrapCompact: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    zIndex: 5,
  },
  label: {
    position: "absolute",
    top: 14,
    left: 14,
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    zIndex: 10,
  },
  gl: {
    flex: 1,
    position: "relative",
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },
  hint: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    fontSize: 12,
    color: "#888",
    zIndex: 10,
  },
});
