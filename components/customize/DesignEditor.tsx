import React, { useRef, useMemo, forwardRef, useImperativeHandle, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
  Platform,
  PanResponder,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import ViewShot from "react-native-view-shot";
import { DesignElement, DesignView, CONTAINER_W, CONTAINER_H } from "./types";
import { ColorBar } from "./ColorBar";
import { Toolbar } from "./Toolbar";
import { TextModal } from "./TextModal";

// White t-shirt silhouette: mask reveals exact hex color only on shirt shape (native); web uses tintColor
const WHITE_TSHIRT_SILHOUETTE = require("@/assets/products/tshirt-white-crew.png");

/** Boost saturation so shirt color appears more vivid in 2D view (display only). */
function toMoreVividHex(hex: string): string {
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  let r = parseInt(m[1].slice(0, 2), 16) / 255;
  let g = parseInt(m[1].slice(2, 4), 16) / 255;
  let b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  s = Math.min(1, s * 1.35);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  r = hue2rgb(p, q, h + 1 / 3);
  g = hue2rgb(p, q, h);
  b = hue2rgb(p, q, h - 1 / 3);
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);
  return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
}

type Props = {
  view: DesignView;
  tshirtColor: string;
  elements: DesignElement[];
  selectedId: string | null;
  textModalVisible: boolean;
  frontImage: ImageSourcePropType;
  backImage: ImageSourcePropType;
  onViewChange: (view: DesignView) => void;
  onColorChange: (color: string) => void;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddImage: () => void;
  onTextModalClose: () => void;
  onTextModalAdd: (opts: {
    text: string;
    fontSize: number;
    color: string;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
  }) => void;
  onSelectElement: (id: string | null) => void;
  onDeleteSelected: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onDragStart?: () => void;
};

export type DesignEditorRef = { capture: () => Promise<string | undefined> };

const DRAG_THRESHOLD = 5;

function getElementBounds(el: DesignElement): { left: number; top: number; width: number; height: number } {
  if (el.type === "text") return { left: el.x - 60, top: el.y - 20, width: 120, height: 40 };
  if (el.type === "rect") return { left: el.x - el.width / 2, top: el.y - el.height / 2, width: el.width, height: el.height };
  if (el.type === "circle") return { left: el.x - el.radius, top: el.y - el.radius, width: el.radius * 2, height: el.radius * 2 };
  if (el.type === "image") return { left: el.x - el.width / 2, top: el.y - el.height / 2, width: el.width, height: el.height };
  return { left: 0, top: 0, width: 0, height: 0 };
}

function getBoundsFromCenter(x: number, y: number, el: DesignElement): { left: number; top: number; width: number; height: number } {
  if (el.type === "text") return { left: x - 60, top: y - 20, width: 120, height: 40 };
  if (el.type === "rect") return { left: x - el.width / 2, top: y - el.height / 2, width: el.width, height: el.height };
  if (el.type === "circle") return { left: x - el.radius, top: y - el.radius, width: el.radius * 2, height: el.radius * 2 };
  if (el.type === "image") return { left: x - el.width / 2, top: y - el.height / 2, width: el.width, height: el.height };
  return { left: 0, top: 0, width: 0, height: 0 };
}

function DesignElementView({
  el,
  isSelected,
  onPress,
  onMoveElement,
  onDragStart,
  containerW,
  containerH,
}: {
  el: DesignElement;
  isSelected: boolean;
  onPress: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onDragStart?: () => void;
  containerW: number;
  containerH: number;
}) {
  const startRef = useRef({ x: el.x, y: el.y });
  const movedRef = useRef(false);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const wrapped = !!onMoveElement;
  const displayX = dragPosition?.x ?? el.x;
  const displayY = dragPosition?.y ?? el.y;
  const bounds = wrapped ? getBoundsFromCenter(displayX, displayY, el) : getElementBounds(el);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { x: el.x, y: el.y };
          movedRef.current = false;
          dragPositionRef.current = null;
          onDragStart?.();
        },
        onPanResponderMove: (_, gestureState) => {
          const { dx, dy } = gestureState;
          if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            movedRef.current = true;
          }
          const newX = Math.max(0, Math.min(containerW, startRef.current.x + dx));
          const newY = Math.max(0, Math.min(containerH, startRef.current.y + dy));
          dragPositionRef.current = { x: newX, y: newY };
          setDragPosition({ x: newX, y: newY });
        },
        onPanResponderRelease: () => {
          if (movedRef.current && dragPositionRef.current) {
            onMoveElement?.(el.id, dragPositionRef.current.x, dragPositionRef.current.y);
          } else if (!movedRef.current) {
            onPress();
          }
          dragPositionRef.current = null;
          setDragPosition(null);
        },
      }),
    [el.id, el.x, el.y, containerW, containerH, onMoveElement, onDragStart, onPress]
  );

  const wrap = (node: React.ReactNode) =>
    wrapped ? (
      <View
        style={[styles.dragWrap, { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }]}
        {...panResponder.panHandlers}
      >
        {node}
      </View>
    ) : (
      node
    );

  if (el.type === "text") {
    return wrap(
      <TouchableOpacity
        style={[
          styles.elementWrap,
          {
            left: wrapped ? 0 : el.x - 60,
            top: wrapped ? 0 : el.y - 20,
            width: 120,
            height: 40,
            borderWidth: isSelected ? 2 : 0,
            borderColor: "#e94560",
          },
        ]}
        onPress={onPress}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.textEl,
            {
              fontSize: el.fontSize,
              color: el.color,
              fontFamily: el.fontFamily,
              fontWeight: el.bold ? "bold" : "normal",
              fontStyle: el.italic ? "italic" : "normal",
            },
          ]}
          numberOfLines={2}
        >
          {el.text}
        </Text>
      </TouchableOpacity>
    );
  }
  if (el.type === "rect") {
    return wrap(
      <TouchableOpacity
        style={[
          styles.shapeEl,
          {
            left: wrapped ? 0 : el.x - el.width / 2,
            top: wrapped ? 0 : el.y - el.height / 2,
            width: el.width,
            height: el.height,
            backgroundColor: el.color,
            borderWidth: isSelected ? 2 : 0,
            borderColor: "#e94560",
          },
        ]}
        onPress={onPress}
        activeOpacity={1}
      />
    );
  }
  if (el.type === "circle") {
    return wrap(
      <TouchableOpacity
        style={[
          styles.shapeEl,
          {
            left: wrapped ? 0 : el.x - el.radius,
            top: wrapped ? 0 : el.y - el.radius,
            width: el.radius * 2,
            height: el.radius * 2,
            borderRadius: el.radius,
            backgroundColor: el.color,
            borderWidth: isSelected ? 2 : 0,
            borderColor: "#e94560",
          },
        ]}
        onPress={onPress}
        activeOpacity={1}
      />
    );
  }
  if (el.type === "image") {
    return wrap(
      <TouchableOpacity
        style={[
          styles.shapeEl,
          {
            left: wrapped ? 0 : el.x - el.width / 2,
            top: wrapped ? 0 : el.y - el.height / 2,
            width: el.width,
            height: el.height,
            borderWidth: isSelected ? 2 : 0,
            borderColor: "#e94560",
            overflow: "hidden",
          },
        ]}
        onPress={onPress}
        activeOpacity={1}
      >
        <Image
          source={{ uri: el.uri }}
          style={{ width: el.width, height: el.height }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }
  return null;
}

/** Renders design elements for capture only (no selection border, no touch). */
function CaptureDesignLayer({ elements }: { elements: DesignElement[] }) {
  return (
    <View style={[styles.designLayer, { width: CONTAINER_W, height: CONTAINER_H }]} pointerEvents="none">
      {elements.map((el) => {
        if (el.type === "text") {
          return (
            <View
              key={el.id}
              style={[
                styles.elementWrap,
                {
                  left: el.x - 60,
                  top: el.y - 20,
                  width: 120,
                  height: 40,
                },
              ]}
            >
              <Text
                style={[
                  styles.textEl,
                  {
                    fontSize: el.fontSize,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontWeight: el.bold ? "bold" : "normal",
                    fontStyle: el.italic ? "italic" : "normal",
                  },
                ]}
                numberOfLines={2}
              >
                {el.text}
              </Text>
            </View>
          );
        }
        if (el.type === "rect") {
          return (
            <View
              key={el.id}
              style={[
                styles.shapeEl,
                {
                  left: el.x - el.width / 2,
                  top: el.y - el.height / 2,
                  width: el.width,
                  height: el.height,
                  backgroundColor: el.color,
                },
              ]}
            />
          );
        }
        if (el.type === "circle") {
          return (
            <View
              key={el.id}
              style={[
                styles.shapeEl,
                {
                  left: el.x - el.radius,
                  top: el.y - el.radius,
                  width: el.radius * 2,
                  height: el.radius * 2,
                  borderRadius: el.radius,
                  backgroundColor: el.color,
                },
              ]}
            />
          );
        }
        if (el.type === "image") {
          return (
            <View
              key={el.id}
              style={[
                styles.shapeEl,
                {
                  left: el.x - el.width / 2,
                  top: el.y - el.height / 2,
                  width: el.width,
                  height: el.height,
                  overflow: "hidden",
                },
              ]}
            >
              <Image
                source={{ uri: el.uri }}
                style={{ width: el.width, height: el.height }}
                resizeMode="cover"
              />
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const DesignEditorInner = ({
  view,
  tshirtColor,
  elements,
  selectedId,
  textModalVisible,
  frontImage,
  backImage,
  onViewChange,
  onColorChange,
  onAddText,
  onAddRect,
  onAddCircle,
  onAddImage,
  onTextModalClose,
  onTextModalAdd,
  onSelectElement,
  onDeleteSelected,
  onMoveElement,
  onDragStart,
  viewShotRef,
  captureShotRef,
}: Props & { viewShotRef: React.RefObject<ViewShot | null>; captureShotRef: React.RefObject<ViewShot | null> }) => (
  <View style={styles.container}>
    <View style={styles.canvasArea}>
      {/* Capture-only view: solid color + design layer so 3D texture includes text/images (no MaskedView). */}
      <ViewShot
        ref={captureShotRef}
        options={{ format: "png", result: "tmpfile" }}
        style={[styles.captureShot, { width: CONTAINER_W, height: CONTAINER_H }]}
      >
        <View style={[StyleSheet.absoluteFill, { width: CONTAINER_W, height: CONTAINER_H, backgroundColor: tshirtColor }]} />
        <CaptureDesignLayer elements={elements} />
      </ViewShot>
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", result: "tmpfile" }}
        style={[styles.tshirtContainer, { width: CONTAINER_W, height: CONTAINER_H }]}
      >
        <View style={[StyleSheet.absoluteFill, { width: CONTAINER_W, height: CONTAINER_H }]}>
          {(() => {
            const silhouetteSource = view === "front" ? frontImage : backImage;
            const displayColor = toMoreVividHex(tshirtColor);
            return Platform.OS === "web" ? (
              <Image
                key={`web-${view}-${tshirtColor}`}
                source={silhouetteSource}
                style={[StyleSheet.absoluteFill, styles.tshirtBg]}
                resizeMode="contain"
                tintColor={displayColor}
              />
            ) : (
              <MaskedView
                key={`mask-${view}-${tshirtColor}`}
                style={[StyleSheet.absoluteFill, styles.tshirtBg]}
                maskElement={
                  <Image
                    source={silhouetteSource}
                    style={[StyleSheet.absoluteFill, styles.tshirtBg]}
                    resizeMode="contain"
                  />
                }
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.tshirtBg,
                    { backgroundColor: displayColor, opacity: 1 },
                  ]}
                />
              </MaskedView>
            );
          })()}
          <View
            style={[styles.designLayer, { width: CONTAINER_W, height: CONTAINER_H }]}
            pointerEvents="box-none"
          >
            {elements.map((el) => (
              <DesignElementView
                key={el.id}
                el={el}
                isSelected={selectedId === el.id}
                onPress={() => onSelectElement(selectedId === el.id ? null : el.id)}
                onMoveElement={onMoveElement}
                onDragStart={onDragStart}
                containerW={CONTAINER_W}
                containerH={CONTAINER_H}
              />
            ))}
          </View>
        </View>
      </ViewShot>

      {selectedId ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDeleteSelected}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      ) : null}

      <ColorBar selectedColor={tshirtColor} onSelectColor={onColorChange} />

      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewBtn, view === "front" && styles.viewBtnActive]}
          onPress={() => onViewChange("front")}
        >
          <Text style={[styles.viewBtnText, view === "front" && styles.viewBtnTextActive]}>
            Front
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, view === "back" && styles.viewBtnActive]}
          onPress={() => onViewChange("back")}
        >
          <Text style={[styles.viewBtnText, view === "back" && styles.viewBtnTextActive]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    <Toolbar
      onImage={onAddImage}
      onText={onAddText}
      onShapeRect={onAddRect}
      onShapeCircle={onAddCircle}
    />

    <TextModal
      visible={textModalVisible}
      onClose={onTextModalClose}
      onAdd={onTextModalAdd}
    />
  </View>
);

const DesignEditorWithRef = forwardRef<DesignEditorRef, Props>(function DesignEditor(props, ref) {
  const viewShotRef = useRef<ViewShot>(null);
  const captureShotRef = useRef<ViewShot>(null);
  useImperativeHandle(ref, () => ({
    capture: () => captureShotRef.current?.capture?.() ?? Promise.resolve(undefined),
  }), []);
  return <DesignEditorInner {...props} viewShotRef={viewShotRef} captureShotRef={captureShotRef} />;
});

export const DesignEditor = DesignEditorWithRef;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  canvasArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c7c5c5",
  },
  tshirtContainer: {
    position: "relative",
  },
  captureShot: {
    position: "absolute",
    left: 0,
    top: 0,
    opacity: 0.01,
    zIndex: -1,
  },
  tshirtBg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  designLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  dragWrap: {
    position: "absolute",
  },
  elementWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  textEl: {
    textAlign: "center",
  },
  shapeEl: {
    position: "absolute",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    left: "50%",
    marginLeft: -40,
    backgroundColor: "#e94560",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 20,
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  viewSwitcher: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
    zIndex: 10,
  },
  viewBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  viewBtnActive: {
    borderColor: "#e94560",
    backgroundColor: "#fff0f3",
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  viewBtnTextActive: {
    color: "#e94560",
  },
});
