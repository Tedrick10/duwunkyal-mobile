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
import { DesignElement, DesignView, TshirtColorPart, CONTAINER_W, CONTAINER_H, TSHIRT_REGIONS } from "./types";
import { ColorBar } from "./ColorBar";
import { Toolbar } from "./Toolbar";
import { TextModal } from "./TextModal";

// White t-shirt silhouette: mask reveals exact hex color only on shirt shape (native); web uses tintColor

type Props = {
  view: DesignView;
  bodyColor: string;
  sleeveColor: string;
  collarColor: string;
  colorPart: TshirtColorPart;
  onColorPartChange: (part: TshirtColorPart) => void;
  elements: DesignElement[];
  selectedId: string | null;
  textModalVisible: boolean;
  frontImage: ImageSourcePropType;
  backImage: ImageSourcePropType;
  onViewChange: (view: DesignView) => void;
  onColorChange: (color: string) => void;
  onAddText: () => void;
  onCliparts: () => void;
  onTemplate: () => void;
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
  onUpdateElement?: (id: string, patch: Record<string, any>) => void;
  onDragStart?: () => void;
  /** When true, hide toolbar/color bar/view switcher and make canvas non-interactive (e.g. for cart design viewer). */
  readOnly?: boolean;
};

export type DesignEditorRef = { capture: () => Promise<string | undefined> };

const DRAG_THRESHOLD = 5;
const DEFAULT_TEXT_W = 120;
const DEFAULT_TEXT_H = 40;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getTextBox(el: any): { w: number; h: number } {
  const w = typeof el.boxWidth === "number" ? el.boxWidth : DEFAULT_TEXT_W;
  const h = typeof el.boxHeight === "number" ? el.boxHeight : DEFAULT_TEXT_H;
  return { w, h };
}

function getElementBounds(el: DesignElement): { left: number; top: number; width: number; height: number } {
  if (el.type === "text") {
    const { w, h } = getTextBox(el);
    return { left: el.x - w / 2, top: el.y - h / 2, width: w, height: h };
  }
  if (el.type === "rect") return { left: el.x - el.width / 2, top: el.y - el.height / 2, width: el.width, height: el.height };
  if (el.type === "circle") return { left: el.x - el.radius, top: el.y - el.radius, width: el.radius * 2, height: el.radius * 2 };
  if (el.type === "image") return { left: el.x - el.width / 2, top: el.y - el.height / 2, width: el.width, height: el.height };
  return { left: 0, top: 0, width: 0, height: 0 };
}

function getBoundsFromCenter(x: number, y: number, el: DesignElement): { left: number; top: number; width: number; height: number } {
  if (el.type === "text") {
    const { w, h } = getTextBox(el);
    return { left: x - w / 2, top: y - h / 2, width: w, height: h };
  }
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
  onUpdateElement,
  onDragStart,
  containerW,
  containerH,
}: {
  el: DesignElement;
  isSelected: boolean;
  onPress: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onUpdateElement?: (id: string, patch: Record<string, any>) => void;
  onDragStart?: () => void;
  containerW: number;
  containerH: number;
}) {
  const startRef = useRef({ x: el.x, y: el.y });
  const movedRef = useRef(false);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    startW?: number;
    startH?: number;
    startR?: number;
    startFont?: number;
    startBoxW?: number;
    startBoxH?: number;
  }>({ active: false, startDist: 1 });
  const pinchRafRef = useRef<number | null>(null);
  const lastScaleRef = useRef(1);

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
          pinchRef.current = { active: false, startDist: 1 };
          onDragStart?.();
        },
        onPanResponderMove: (evt, gestureState) => {
          const e = evt as unknown as { nativeEvent: { touches?: Array<{ pageX: number; pageY: number }> } };
          const touches = e.nativeEvent.touches ?? [];

          // Pinch to scale (two fingers).
          if (touches.length >= 2 && onUpdateElement) {
            const t0 = touches[0]!;
            const t1 = touches[1]!;
            const dx = t0.pageX - t1.pageX;
            const dy = t0.pageY - t1.pageY;
            const dist = Math.max(1, Math.hypot(dx, dy));

            if (!pinchRef.current.active) {
              pinchRef.current.active = true;
              pinchRef.current.startDist = dist;
              movedRef.current = true;
              // Snapshot element size for stable scaling.
              if (el.type === "image" || el.type === "rect") {
                pinchRef.current.startW = el.width;
                pinchRef.current.startH = el.height;
              } else if (el.type === "circle") {
                pinchRef.current.startR = el.radius;
              } else if (el.type === "text") {
                const { w, h } = getTextBox(el);
                pinchRef.current.startFont = el.fontSize;
                pinchRef.current.startBoxW = w;
                pinchRef.current.startBoxH = h;
              }
            }

            const scale = dist / pinchRef.current.startDist;
            lastScaleRef.current = scale;

            if (pinchRafRef.current != null) return;
            pinchRafRef.current = requestAnimationFrame(() => {
              pinchRafRef.current = null;
              const s = lastScaleRef.current;
              if (!pinchRef.current.active) return;

              if (el.type === "image" || el.type === "rect") {
                const startW = pinchRef.current.startW ?? el.width;
                const startH = pinchRef.current.startH ?? el.height;
                onUpdateElement(el.id, {
                  width: clamp(Math.round(startW * s), 20, 320),
                  height: clamp(Math.round(startH * s), 20, 320),
                });
              } else if (el.type === "circle") {
                const startR = pinchRef.current.startR ?? el.radius;
                onUpdateElement(el.id, {
                  radius: clamp(Math.round(startR * s), 10, 200),
                });
              } else if (el.type === "text") {
                const startFont = pinchRef.current.startFont ?? el.fontSize;
                const startBoxW = pinchRef.current.startBoxW ?? getTextBox(el).w;
                onUpdateElement(el.id, {
                  fontSize: clamp(Math.round(startFont * s), 10, 96),
                  boxWidth: clamp(Math.round(startBoxW * s), 80, 320),
                });
              }
            });
            return;
          }

          // If pinch ended (lift one finger), clear pinch state.
          if (pinchRef.current.active && touches.length < 2) {
            pinchRef.current.active = false;
          }

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
          if (pinchRef.current.active) {
            pinchRef.current.active = false;
          } else if (movedRef.current && dragPositionRef.current) {
            onMoveElement?.(el.id, dragPositionRef.current.x, dragPositionRef.current.y);
          } else if (!movedRef.current) {
            onPress();
          }
          dragPositionRef.current = null;
          setDragPosition(null);
        },
      }),
    [
      el,
      containerW,
      containerH,
      onMoveElement,
      onUpdateElement,
      onDragStart,
      onPress,
    ]
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
    const { w, h } = getTextBox(el);
    return wrap(
      <TouchableOpacity
        style={[
          styles.elementWrap,
          {
            left: wrapped ? 0 : el.x - w / 2,
            top: wrapped ? 0 : el.y - h / 2,
            width: w,
            height: h,
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
              lineHeight: Math.round(el.fontSize * 1.25),
              color: el.color,
              fontFamily: el.fontFamily,
              fontWeight: el.bold ? "bold" : "normal",
              fontStyle: el.italic ? "italic" : "normal",
            },
          ]}
          onTextLayout={(e) => {
            if (!onUpdateElement) return;
            const lines = (e.nativeEvent as any).lines as Array<{ height: number }> | undefined;
            if (!lines || !lines.length) return;
            const total = Math.ceil(lines.reduce((sum, l) => sum + (l.height ?? 0), 0)) + 6;
            const cur = typeof (el as any).boxHeight === "number" ? (el as any).boxHeight : DEFAULT_TEXT_H;
            if (Math.abs(total - cur) >= 2) onUpdateElement(el.id, { boxHeight: clamp(total, 24, 260) });
          }}
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
          const { w, h } = getTextBox(el);
          return (
            <View
              key={el.id}
              style={[
                styles.elementWrap,
                {
                  left: el.x - w / 2,
                  top: el.y - h / 2,
                  width: w,
                  height: h,
                },
              ]}
            >
              <Text
                style={[
                  styles.textEl,
                  {
                    fontSize: el.fontSize,
                    lineHeight: Math.round(el.fontSize * 1.25),
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontWeight: el.bold ? "bold" : "normal",
                    fontStyle: el.italic ? "italic" : "normal",
                  },
                ]}
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
  bodyColor,
  sleeveColor,
  collarColor,
  colorPart,
  onColorPartChange,
  elements,
  selectedId,
  textModalVisible,
  frontImage,
  backImage,
  onViewChange,
  onColorChange,
  onAddText,
  onCliparts,
  onTemplate,
  onAddImage,
  onTextModalClose,
  onTextModalAdd,
  onSelectElement,
  onDeleteSelected,
  onMoveElement,
  onUpdateElement,
  onDragStart,
  readOnly = false,
  viewShotRef,
  captureShotRef,
}: Props & { viewShotRef: React.RefObject<ViewShot | null>; captureShotRef: React.RefObject<ViewShot | null> }) => {
  const silhouetteSource = view === "front" ? frontImage : backImage;
  const selectedColor = colorPart === "body" ? bodyColor : colorPart === "sleeves" ? sleeveColor : collarColor;
  const ch = CONTAINER_H * TSHIRT_REGIONS.collarHeight;
  const sw = CONTAINER_W * TSHIRT_REGIONS.sleeveWidth;
  const bodyW = CONTAINER_W - sw * 2;
  const bodyH = CONTAINER_H - ch;

  const renderRegion = (color: string, key: string) =>
    Platform.OS === "web" ? (
      <Image
        key={key}
        source={silhouetteSource}
        style={[StyleSheet.absoluteFill, styles.tshirtBg]}
        resizeMode="contain"
        tintColor={color}
      />
    ) : (
      <MaskedView
        key={key}
        style={[StyleSheet.absoluteFill, styles.tshirtBg]}
        maskElement={
          <Image source={silhouetteSource} style={[StyleSheet.absoluteFill, styles.tshirtBg]} resizeMode="contain" />
        }
      >
        <View style={[StyleSheet.absoluteFill, styles.tshirtBg, { backgroundColor: color, opacity: 1 }]} />
      </MaskedView>
    );

  return (
    <View style={styles.container}>
      <View style={styles.canvasArea}>
        <ViewShot
          ref={captureShotRef}
          options={{ format: "png", result: "tmpfile" }}
          style={[styles.captureShot, { width: CONTAINER_W, height: CONTAINER_H }]}
        >
          <View style={[StyleSheet.absoluteFill, { width: CONTAINER_W, height: CONTAINER_H, backgroundColor: "transparent" }]} />
          <CaptureDesignLayer elements={elements} />
        </ViewShot>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", result: "tmpfile" }}
          style={[styles.tshirtContainer, { width: CONTAINER_W, height: CONTAINER_H }]}
        >
          <View style={[StyleSheet.absoluteFill, { width: CONTAINER_W, height: CONTAINER_H }]}>
            {/* Same front/back image, 3 regions via overflow-hidden windows */}
            {/* Collar: top strip */}
            <View style={[styles.regionWindow, { top: 0, left: 0, width: CONTAINER_W, height: ch }]} pointerEvents="none">
              <View style={[styles.regionMaskWrap, { width: CONTAINER_W, height: CONTAINER_H, left: 0, top: 0 }]}>
                {renderRegion(collarColor, `collar-${view}-${collarColor}`)}
              </View>
            </View>
            {/* Body: center */}
            <View style={[styles.regionWindow, { top: ch, left: sw, width: bodyW, height: bodyH }]} pointerEvents="none">
              <View style={[styles.regionMaskWrap, { width: CONTAINER_W, height: CONTAINER_H, left: -sw, top: -ch }]}>
                {renderRegion(bodyColor, `body-${view}-${bodyColor}`)}
              </View>
            </View>
            {/* Left sleeve */}
            <View style={[styles.regionWindow, { top: ch, left: 0, width: sw, height: bodyH }]} pointerEvents="none">
              <View style={[styles.regionMaskWrap, { width: CONTAINER_W, height: CONTAINER_H, left: 0, top: -ch }]}>
                {renderRegion(sleeveColor, `sleeveL-${view}-${sleeveColor}`)}
              </View>
            </View>
            {/* Right sleeve */}
            <View style={[styles.regionWindow, { top: ch, left: CONTAINER_W - sw, width: sw, height: bodyH }]} pointerEvents="none">
              <View style={[styles.regionMaskWrap, { width: CONTAINER_W, height: CONTAINER_H, left: -(CONTAINER_W - sw), top: -ch }]}>
                {renderRegion(sleeveColor, `sleeveR-${view}-${sleeveColor}`)}
              </View>
            </View>
            <View
              style={[styles.designLayer, { width: CONTAINER_W, height: CONTAINER_H }]}
              pointerEvents={readOnly ? "none" : "box-none"}
            >
              {elements.map((el) => (
                <DesignElementView
                  key={el.id}
                  el={el}
                  isSelected={selectedId === el.id}
                  onPress={() => onSelectElement(selectedId === el.id ? null : el.id)}
                  onMoveElement={onMoveElement}
                  onUpdateElement={onUpdateElement}
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

        {!readOnly && (
          <>
            <View style={styles.colorPartRow}>
              <TouchableOpacity
                style={[styles.colorPartBtn, colorPart === "body" && styles.colorPartBtnActive]}
                onPress={() => onColorPartChange("body")}
                activeOpacity={0.8}
              >
                <Text style={[styles.colorPartText, colorPart === "body" && styles.colorPartTextActive]}>Body</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.colorPartBtn, colorPart === "sleeves" && styles.colorPartBtnActive]}
                onPress={() => onColorPartChange("sleeves")}
                activeOpacity={0.8}
              >
                <Text style={[styles.colorPartText, colorPart === "sleeves" && styles.colorPartTextActive]}>Sleeves</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.colorPartBtn, colorPart === "collar" && styles.colorPartBtnActive]}
                onPress={() => onColorPartChange("collar")}
                activeOpacity={0.8}
              >
                <Text style={[styles.colorPartText, colorPart === "collar" && styles.colorPartTextActive]}>Collar</Text>
              </TouchableOpacity>
            </View>
            <ColorBar selectedColor={selectedColor} onSelectColor={onColorChange} />

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
          </>
        )}
      </View>

      {!readOnly && (
        <>
          <Toolbar
            onImage={onAddImage}
            onText={onAddText}
            onCliparts={onCliparts}
            onTemplate={onTemplate}
          />

          <TextModal
            visible={textModalVisible}
            onClose={onTextModalClose}
            onAdd={onTextModalAdd}
          />
        </>
      )}
    </View>
  );
};

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
  regionWindow: {
    position: "absolute",
    overflow: "hidden",
  },
  regionMaskWrap: {
    position: "absolute",
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
  colorPartRow: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    gap: 10,
    zIndex: 10,
  },
  colorPartBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  colorPartBtnActive: {
    backgroundColor: "#e94560",
  },
  colorPartText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "500",
  },
  colorPartTextActive: {
    fontWeight: "700",
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
