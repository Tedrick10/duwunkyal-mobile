import React, { useRef, useMemo, forwardRef, useImperativeHandle, useState, useDeferredValue, memo, useCallback } from "react";
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
import Svg, { Rect, Ellipse } from "react-native-svg";
import { SvgXml } from "react-native-svg";
import { tintSvgFills, ensureSvgFits } from "@/lib/tintSvgFills";
import type { ProductCustomizationRegion } from "@/lib/query-client";
import { DesignElement, DesignView, TshirtColorPart, CONTAINER_W, CONTAINER_H } from "./types";
import { ColorBar } from "./ColorBar";
import { Toolbar } from "./Toolbar";
import { TextModal } from "./TextModal";

// When frontSvg/backSvg are provided, use SVG with tinted fills (natural shading). Otherwise Image + MaskedView/tintColor.

/** Segment label from Clothing Segments API (id, name, defaultHex). */
export type SegmentLabelItem = { id: number; name: string; defaultHex?: string };

type Props = {
  view: DesignView;
  bodyColor: string;
  sleeveColor: string;
  collarColor: string;
  cuffColor?: string;
  colorPart: string;
  onColorPartChange: (part: string) => void;
  elements: DesignElement[];
  selectedId: string | null;
  textModalVisible: boolean;
  frontImage: ImageSourcePropType;
  backImage: ImageSourcePropType;
  /** Optional: SVG string (e.g. from TSHIRT_FRONT_SVG). When set, 2D view uses SVG with tinted fills for natural shading. */
  frontSvg?: string;
  backSvg?: string;
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
  /** When provided (e.g. from productCustomization API), passed to ColorBar for region colors. */
  availableColors?: Array<{ hex: string; name?: string }>;
  /** When true, display front/back images as-is from backend (no mask/color overlay). Use for full product photos. */
  displayBaseImageAsPhoto?: boolean;
  /** Template regions from API (body, collar, sleeve, cuff with rect/ellipse in 0–100%). When set, colors are applied per region. */
  frontRegions?: Record<string, ProductCustomizationRegion>;
  backRegions?: Record<string, ProductCustomizationRegion>;
  /** Per-region mask image URLs for precise coloring (when set, used instead of rect/ellipse for that region). */
  frontRegionMasks?: Record<string, string> | null;
  backRegionMasks?: Record<string, string> | null;
  /** Segment labels from Clothing Segments API (for display names e.g. Cuff → Cut Off). */
  frontSegmentLabels?: SegmentLabelItem[] | null;
  backSegmentLabels?: SegmentLabelItem[] | null;
  /** crew_neck = T-shirt: show "Neckline" instead of "Collar" for that region. */
  neckStyle?: "collar" | "crew_neck" | null;
};

export type DesignEditorRef = {
  capture: () => Promise<string | undefined>;
  captureRendered: () => Promise<string | undefined>;
};

const DRAG_THRESHOLD = 5;
const DEFAULT_TEXT_W = 120;
const DEFAULT_TEXT_H = 40;

/** Fallback regions when API provides none – Body, Collar, Sleeve, Cuff (Cut Off) for typical shirt images. */
const DEFAULT_FALLBACK_REGIONS: Record<string, ProductCustomizationRegion> = {
  body: { type: "rect", x: 15, y: 15, width: 70, height: 70 },
  collar: { type: "ellipse", cx: 50, cy: 20, rx: 25, ry: 8 },
  sleeve: { type: "rect", x: 5, y: 25, width: 90, height: 50 },
  cuff: { type: "rect", x: 5, y: 70, width: 90, height: 12 },
};

/** Display label for region key (e.g. cuff → Cut Off). crew_neck → "Neckline" instead of "Collar". */
function getRegionLabel(
  key: string,
  segmentLabels?: SegmentLabelItem[] | null,
  neckStyle?: "collar" | "crew_neck" | null
): string {
  if (key === "body") return "Body";
  if (key === "collar") return neckStyle === "crew_neck" ? "Neckline" : "Collar";
  if (key === "sleeve" || key === "sleeve_left" || key === "sleeve_right") return "Sleeve";
  if (key === "cuff" || key === "cut_off") return "Cut Off";
  const seg = segmentLabels?.find((s) => s.name.toLowerCase() === key.replace(/_/g, " "));
  if (seg) return seg.name;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

const DesignEditorInner = memo(function DesignEditorInner({
  view,
  bodyColor,
  sleeveColor,
  collarColor,
  cuffColor = "#ffffff",
  colorPart,
  onColorPartChange,
  elements,
  selectedId,
  textModalVisible,
  frontImage,
  backImage,
  frontSvg,
  backSvg,
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
  availableColors,
  displayBaseImageAsPhoto = false,
  frontRegions,
  backRegions,
  frontRegionMasks,
  backRegionMasks,
  frontSegmentLabels,
  backSegmentLabels,
  neckStyle,
  viewShotRef,
  captureShotRef,
}: Props & { viewShotRef: React.RefObject<ViewShot | null>; captureShotRef: React.RefObject<ViewShot | null> }) {
  const currentRegions = view === "front" ? frontRegions : backRegions;
  const currentRegionMasks = view === "front" ? frontRegionMasks : backRegionMasks;
  const currentSegmentLabels = view === "front" ? frontSegmentLabels : backSegmentLabels;
  const regionKeysFromRegions = Object.keys(currentRegions || {});
  const regionKeysFromMasks = Object.keys(currentRegionMasks || {});
  const allRegionKeys = Array.from(new Set([...regionKeysFromRegions, ...regionKeysFromMasks]));
  // Draw order: body first, then sleeve, cuff, collar last so collar/smaller regions overlay and don’t get overwritten by sleeve
  const REGION_DRAW_ORDER = ["body", "sleeve", "sleeve_left", "sleeve_right", "cuff", "cut_off", "collar"];
  const sortedRegionKeysForDraw = [...allRegionKeys].sort((a, b) => {
    const i = REGION_DRAW_ORDER.indexOf(a);
    const j = REGION_DRAW_ORDER.indexOf(b);
    if (i >= 0 && j >= 0) return i - j;
    if (i >= 0) return -1;
    if (j >= 0) return 1;
    return a.localeCompare(b);
  });
  const hasTemplateRegions = allRegionKeys.length > 0;
  const regionButtons: Array<{ id: string; label: string }> = hasTemplateRegions
    ? allRegionKeys.map((key) => ({
      id: key,
      label: getRegionLabel(key, currentSegmentLabels, neckStyle),
    }))
    : [
      { id: "body", label: "Body" },
      { id: "sleeve", label: "Sleeve" },
      { id: "collar", label: getRegionLabel("collar", null, neckStyle) },
      { id: "cuff", label: "Cut Off" },
    ];

  // Track mask image loads so MaskedView re-renders when remote mask is ready (fixes race on Android/iOS)
  const [maskLoadedKeys, setMaskLoadedKeys] = useState<Set<string>>(() => new Set());
  const [, setBaseImageLoaded] = useState(0);
  const onBaseImageLoad = useCallback(() => setBaseImageLoaded((n) => n + 1), []);
  const onMaskLoad = useCallback((viewKey: string, regionKey: string) => {
    setMaskLoadedKeys((prev) => {
      const k = `${viewKey}-${regionKey}`;
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }, []);

  // Defer expensive SVG tint so Front/Back and color taps feel instant.
  // Use `view` (not deferred) for silhouette/svg so 2D mock-up shows on first load (deferred can be stale initially).
  const deferredView = useDeferredValue(view);
  const deferredBodyColor = useDeferredValue(bodyColor);
  const deferredSleeveColor = useDeferredValue(sleeveColor);
  const deferredCollarColor = useDeferredValue(collarColor);
  const deferredCuffColor = useDeferredValue(cuffColor);

  const silhouetteSource = view === "front" ? frontImage : backImage;
  const svgSource = view === "front" ? frontSvg : backSvg;
  const selectedColor =
    colorPart === "body"
      ? bodyColor
      : colorPart === "sleeves" || colorPart === "sleeve" || colorPart === "sleeve_left" || colorPart === "sleeve_right"
        ? sleeveColor
        : colorPart === "cuff" || colorPart === "cut_off"
          ? cuffColor
          : collarColor;

  const svgFitted = useMemo(
    () => (svgSource ? ensureSvgFits(svgSource) : null),
    [svgSource]
  );
  const tintedCollarSvg = useMemo(
    () => (svgFitted ? tintSvgFills(svgFitted, deferredCollarColor) : null),
    [svgFitted, deferredCollarColor]
  );
  const tintedBodySvg = useMemo(
    () => (svgFitted ? tintSvgFills(svgFitted, deferredBodyColor) : null),
    [svgFitted, deferredBodyColor]
  );
  const tintedSleeveSvg = useMemo(
    () => (svgFitted ? tintSvgFills(svgFitted, deferredSleeveColor) : null),
    [svgFitted, deferredSleeveColor]
  );

  const getColorForRegionKey = (regionKey: string): string => {
    if (regionKey === "body") return deferredBodyColor;
    if (regionKey === "collar") return deferredCollarColor;
    if (regionKey === "sleeve" || regionKey === "sleeve_left" || regionKey === "sleeve_right") return deferredSleeveColor;
    if (regionKey === "cuff" || regionKey === "cut_off") return deferredCuffColor;
    return deferredBodyColor;
  };

  const renderRegion = (color: string, key: string, region: "collar" | "body" | "sleeve") => {
    const src = silhouetteSource;
    if (displayBaseImageAsPhoto) {
      return (
        <Image
          key={key}
          source={src}
          style={[StyleSheet.absoluteFill, styles.tshirtBg]}
          resizeMode="contain"
        />
      );
    }
    const tintedSvg =
      region === "collar" ? tintedCollarSvg : region === "body" ? tintedBodySvg : tintedSleeveSvg;
    if (tintedSvg) {
      return (
        <SvgXml
          key={key}
          xml={tintedSvg}
          width={CONTAINER_W}
          height={CONTAINER_H}
          style={[StyleSheet.absoluteFill, styles.tshirtBg]}
        />
      );
    }
    const applyColorOverBackendImage =
      !svgSource && src && typeof (src as any)?.uri === "string";
    if (applyColorOverBackendImage) {
      return (
        <MaskedView
          key={key}
          style={[StyleSheet.absoluteFill, styles.tshirtBg]}
          maskElement={
            <Image source={src} style={[StyleSheet.absoluteFill, styles.tshirtBg]} resizeMode="contain" />
          }
        >
          <View style={[StyleSheet.absoluteFill, styles.tshirtBg]}>
            <Image
              source={src}
              style={[StyleSheet.absoluteFill, styles.tshirtBg]}
              resizeMode="contain"
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.tshirtBg,
                {
                  backgroundColor: color,
                  opacity: 0.5,
                },
              ]}
            />
          </View>
        </MaskedView>
      );
    }
    return Platform.OS === "web" ? (
      <Image
        key={key}
        source={src}
        style={[StyleSheet.absoluteFill, styles.tshirtBg]}
        resizeMode="contain"
        tintColor={color}
      />
    ) : (
      <MaskedView
        key={key}
        style={[StyleSheet.absoluteFill, styles.tshirtBg]}
        maskElement={
          <Image source={src} style={[StyleSheet.absoluteFill, styles.tshirtBg]} resizeMode="contain" />
        }
      >
        <View style={[StyleSheet.absoluteFill, styles.tshirtBg, { backgroundColor: color, opacity: 1 }]} />
      </MaskedView>
    );
  };

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
            <View style={[StyleSheet.absoluteFill, { width: CONTAINER_W, height: CONTAINER_H }]} pointerEvents="none">
              {displayBaseImageAsPhoto ? (
                <Image
                  source={silhouetteSource}
                  style={[StyleSheet.absoluteFill, styles.tshirtBg]}
                  resizeMode="contain"
                  onLoad={onBaseImageLoad}
                />
              ) : hasTemplateRegions ? (
                <>
                  <Image
                    source={silhouetteSource}
                    style={[StyleSheet.absoluteFill, styles.tshirtBg]}
                    resizeMode="contain"
                    onLoad={onBaseImageLoad}
                  />
                  {sortedRegionKeysForDraw.map((regionKey) => {
                    const color = getColorForRegionKey(regionKey);
                    const w = CONTAINER_W;
                    const h = CONTAINER_H;
                    const maskUrl = currentRegionMasks?.[regionKey];
                    const region = currentRegions?.[regionKey];
                    if (maskUrl) {
                      return (
                        <MaskedView
                          key={`region-${deferredView}-${regionKey}`}
                          style={[StyleSheet.absoluteFill, styles.tshirtBg, { width: w, height: h }]}
                          maskElement={
                            <Image
                              source={{ uri: maskUrl }}
                              style={[StyleSheet.absoluteFill, styles.tshirtBg, { width: w, height: h }]}
                              resizeMode="contain"
                              onLoad={() => onMaskLoad(deferredView, regionKey)}
                            />
                          }
                        >
                          <View style={[StyleSheet.absoluteFill, styles.tshirtBg, { backgroundColor: color, opacity: 1 }]} />
                        </MaskedView>
                      );
                    }
                    if (!region) return null;
                    const hasRectCoords =
                      typeof region.x === "number" &&
                      typeof region.y === "number" &&
                      (typeof region.width === "number" || typeof (region as any).w === "number") &&
                      (typeof region.height === "number" || typeof (region as any).h === "number");
                    const hasEllipseCoords =
                      typeof region.cx === "number" &&
                      typeof region.cy === "number" &&
                      typeof region.rx === "number" &&
                      typeof region.ry === "number";
                    const isRect =
                      (region.type === "rect" || (!region.type && hasRectCoords)) && hasRectCoords;
                    const isEllipse =
                      region.type === "ellipse" || hasEllipseCoords;
                    if (!isRect && !isEllipse) return null;
                    return (
                      <MaskedView
                        key={`region-${deferredView}-${regionKey}`}
                        style={[StyleSheet.absoluteFill, styles.tshirtBg, { width: w, height: h }]}
                        maskElement={
                          <View style={[StyleSheet.absoluteFill, { width: w, height: h }]}>
                            <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
                              {isRect ? (
                                <Rect
                                  x={((region.x ?? 0) / 100) * w}
                                  y={((region.y ?? 0) / 100) * h}
                                  width={((region.width ?? (region as any).w ?? 0) / 100) * w}
                                  height={((region.height ?? (region as any).h ?? 0) / 100) * h}
                                  fill="white"
                                />
                              ) : (
                                <Ellipse
                                  cx={((region.cx ?? 0) / 100) * w}
                                  cy={((region.cy ?? 0) / 100) * h}
                                  rx={((region.rx ?? 0) / 100) * w}
                                  ry={((region.ry ?? 0) / 100) * h}
                                  fill="white"
                                />
                              )}
                            </Svg>
                          </View>
                        }
                      >
                        <View style={[StyleSheet.absoluteFill, styles.tshirtBg, { backgroundColor: color, opacity: 1 }]} />
                      </MaskedView>
                    );
                  })}
                </>
              ) : (
                renderRegion(deferredBodyColor, `shirt-${deferredView}`, "body")
              )}
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
              {regionButtons.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.colorPartBtn, colorPart === id && styles.colorPartBtnActive]}
                  onPress={() => onColorPartChange(id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.colorPartText, colorPart === id && styles.colorPartTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ColorBar selectedColor={selectedColor} onSelectColor={onColorChange} colors={availableColors} />

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
});

const DesignEditorWithRef = forwardRef<DesignEditorRef, Props>(function DesignEditor(props, ref) {
  const viewShotRef = useRef<ViewShot>(null);
  const captureShotRef = useRef<ViewShot>(null);
  useImperativeHandle(ref, () => ({
    capture: () => captureShotRef.current?.capture?.() ?? Promise.resolve(undefined),
    captureRendered: () => viewShotRef.current?.capture?.() ?? Promise.resolve(undefined),
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
