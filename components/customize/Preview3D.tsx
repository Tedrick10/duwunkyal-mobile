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
import * as FileSystem from "expo-file-system/legacy";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type Props = {
  tshirtColor: string;
  objUri: string | null;
  objReady?: boolean;
  compact?: boolean;
  designTextureUri?: string | null;
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
  material: THREE.MeshStandardMaterial
) {
  obj.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) ensureGeometryUVs(mesh.geometry);
      mesh.material = material;
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

export function Preview3D({ tshirtColor, objUri, objReady = true, compact = false, designTextureUri = null }: Props) {
  const animRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const prevPanRef = useRef({ x: 0, y: 0 });
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const tshirtColorRef = useRef(tshirtColor);
  tshirtColorRef.current = tshirtColor;
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => () => {
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    materialRef.current = null;
  }, []);

  useEffect(() => {
    LogBox.ignoreLogs(["EXGL: gl.pixelStorei"]);
  }, []);

  useEffect(() => {
    if (materialRef.current && !materialRef.current.map) materialRef.current.color.setStyle(tshirtColor);
  }, [tshirtColor]);

  useEffect(() => {
    if (!designTextureUri && materialRef.current) {
      if (materialRef.current.map) {
        materialRef.current.map.dispose();
        materialRef.current.map = null;
      }
      materialRef.current.color.setStyle(tshirtColor);
    }
  }, [designTextureUri, tshirtColor]);

  useEffect(() => {
    if (modelReady && materialRef.current && !materialRef.current.map) {
      materialRef.current.color.setStyle(tshirtColor);
    }
  }, [modelReady, tshirtColor]);

  // Full-screen: force color sync one frame after GL is ready (avoids stale ref on first paint)
  useEffect(() => {
    if (compact || !modelReady || !materialRef.current || materialRef.current.map) return;
    const id = requestAnimationFrame(() => {
      if (materialRef.current && !materialRef.current.map)
        materialRef.current.color.setStyle(tshirtColor);
    });
    return () => cancelAnimationFrame(id);
  }, [compact, modelReady, tshirtColor]);

  useEffect(() => {
    if (!designTextureUri || !materialRef.current || !modelReady) return;
    let cancelled = false;
    const textureAsset = Asset.fromURI(designTextureUri);
    textureAsset
      .downloadAsync()
      .then(() => loadTextureAsync({ asset: textureAsset }))
      .then((tex: THREE.Texture) => {
        if (!cancelled && materialRef.current) {
          materialRef.current.map = tex;
          materialRef.current.color.setStyle(tshirtColor);
        }
      })
      .catch(() => {
        if (!cancelled && materialRef.current) materialRef.current.map = null;
      });
    return () => {
      cancelled = true;
      if (materialRef.current?.map) {
        materialRef.current.map.dispose();
        materialRef.current.map = null;
      }
    };
  }, [designTextureUri, modelReady, tshirtColor]);

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
      antialias: true,
      width,
      height,
      pixelRatio: Math.min(2, gl.drawingBufferWidth / width),
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-2, 1, -3);
    scene.add(backLight);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialColor),
      roughness: 0.7,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    materialRef.current = material;

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
          const objText = await FileSystem.readAsStringAsync(objUri, {
            encoding: "utf8",
          });
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

    material.color.setStyle(initialColor);
    setModelReady(true);

    function animate() {
      animRef.current = requestAnimationFrame(animate);
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
    }
    animate();

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
