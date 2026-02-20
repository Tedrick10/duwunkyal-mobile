import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  PanResponder,
  TouchableWithoutFeedback,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "./types";

const PICKER_SIZE = 140;
const HUE_BAR_HEIGHT = 14;
const HUE_BAR_WIDTH = PICKER_SIZE * 2 + 12;
const SLIDER_SIZE = 18;

// Full hue spectrum: red → orange → yellow → lime → green → cyan → blue → violet → magenta → red
const HUE_COLORS = [
  "#ff0000", "#ff8000", "#ffff00", "#80ff00", "#00ff00", "#00ff80", "#00ffff",
  "#0080ff", "#0000ff", "#8000ff", "#ff00ff", "#ff0080", "#ff0000",
] as const;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function hexToHsv(hex: string): { h: number; s: number; v: number; a: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
  if (!m) return { h: 0, s: 0, v: 0, a: 1 };
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const a = m[4] ? parseInt(m[4], 16) / 255 : 1;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, v, a };
}

function hsvToHex(h: number, s: number, v: number, a: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  const A = clamp(a, 0, 1);
  if (A >= 1) {
    return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
  }
  return `rgba(${R},${G},${B},${A})`;
}

function hslFromHue(h: number): string {
  const [r, g, b] = (() => {
    const c = 0.5;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = 0.5 - c;
    if (h < 60) return [c + m, x + m, m];
    if (h < 120) return [x + m, c + m, m];
    if (h < 180) return [m, c + m, x + m];
    if (h < 240) return [m, x + m, c + m];
    if (h < 300) return [x + m, m, c + m];
    return [c + m, m, x + m];
  })();
  const R = Math.round(r * 255).toString(16).padStart(2, "0");
  const G = Math.round(g * 255).toString(16).padStart(2, "0");
  const B = Math.round(b * 255).toString(16).padStart(2, "0");
  return `#${R}${G}${B}`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (opts: {
    text: string;
    fontSize: number;
    color: string;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
  }) => void;
};

export function TextModal({ visible, onClose, onAdd }: Props) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Arial");

  const hsv = hexToHsv(color);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);

  const updateColorFromHsv = useCallback((h: number, s: number, v: number) => {
    setColor(hsvToHex(h, s, v, 1));
  }, []);

  const handleHuePress = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      const { locationX } = evt.nativeEvent;
      const h = clamp((locationX / HUE_BAR_WIDTH) * 360, 0, 360);
      setHue(h);
      updateColorFromHsv(h, sat, val);
    },
    [sat, val, updateColorFromHsv]
  );

  const huePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX } = evt.nativeEvent;
          const h = clamp((locationX / HUE_BAR_WIDTH) * 360, 0, 360);
          setHue(h);
          updateColorFromHsv(h, sat, val);
        },
        onPanResponderMove: (evt, gs) => {
          const refX = evt.nativeEvent.locationX + gs.dx;
          const h = clamp((refX / HUE_BAR_WIDTH) * 360, 0, 360);
          setHue(h);
          updateColorFromHsv(h, sat, val);
        },
      }),
    [sat, val, updateColorFromHsv]
  );

  const handleSatValPress = useCallback(
    (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = evt.nativeEvent;
      const s = clamp(locationX / PICKER_SIZE, 0, 1);
      const v = clamp(1 - locationY / PICKER_SIZE, 0, 1);
      setSat(s);
      setVal(v);
      updateColorFromHsv(hue, s, v);
    },
    [hue, updateColorFromHsv]
  );

  const satValPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const s = clamp(locationX / PICKER_SIZE, 0, 1);
          const v = clamp(1 - locationY / PICKER_SIZE, 0, 1);
          setSat(s);
          setVal(v);
          updateColorFromHsv(hue, s, v);
        },
        onPanResponderMove: (evt, gs) => {
          const locX = evt.nativeEvent.locationX + gs.dx;
          const locY = evt.nativeEvent.locationY + gs.dy;
          const s = clamp(locX / PICKER_SIZE, 0, 1);
          const v = clamp(1 - locY / PICKER_SIZE, 0, 1);
          setSat(s);
          setVal(v);
          updateColorFromHsv(hue, s, v);
        },
      }),
    [hue, updateColorFromHsv]
  );

  const solidColor = hsvToHex(hue, sat, val, 1);
  const hexValue = solidColor.startsWith("#") ? solidColor.toLowerCase() : solidColor;
  const handleCopyHex = useCallback(() => {
    Clipboard.setStringAsync(hexValue);
  }, [hexValue]);

  const handleAdd = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({
      text: t,
      fontSize: 24,
      color: solidColor,
      fontFamily,
      bold: false,
      italic: false,
    });
    setText("");
    setColor("#000000");
    setHue(0);
    setSat(0);
    setVal(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modal}>
            <Text style={styles.title}>Add Text</Text>

            <Text style={styles.label}>Text</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your text..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Font</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fontRow}
            >
              {FONTS.map((font) => (
                <TouchableOpacity
                  key={font}
                  style={[styles.fontChip, fontFamily === font && styles.fontChipActive]}
                  onPress={() => setFontFamily(font)}
                >
                  <Text
                    style={[styles.fontChipText, fontFamily === font && styles.fontChipTextActive]}
                    numberOfLines={1}
                  >
                    {font}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Colour picker</Text>
            <View style={styles.colorPickerWrap}>
              {/* Row: Color preview + SV square */}
              <View style={styles.colorPickerRow}>
                <View style={[styles.colorPreview, { backgroundColor: solidColor }]} />
                <View style={styles.satValWrap}>
                  <TouchableWithoutFeedback onPress={handleSatValPress}>
                    <View style={styles.satValInner}>
                      <LinearGradient
                        colors={["#fff", hslFromHue(hue)]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                      >
                        <LinearGradient
                          colors={["rgba(0,0,0,0)", "#000"]}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </LinearGradient>
                    </View>
                  </TouchableWithoutFeedback>
                  <View
                    {...satValPanResponder.panHandlers}
                    style={[
                      styles.slider,
                      {
                        backgroundColor: solidColor,
                        transform: [
                          { translateX: sat * PICKER_SIZE - SLIDER_SIZE / 2 },
                          { translateY: (1 - val) * PICKER_SIZE - SLIDER_SIZE / 2 },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Horizontal hue bar */}
              <View style={styles.hueWrap}>
                <TouchableWithoutFeedback onPress={handleHuePress}>
                  <View style={styles.hueBar}>
                    <LinearGradient
                      colors={HUE_COLORS}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </TouchableWithoutFeedback>
                <View
                  {...huePanResponder.panHandlers}
                  style={[
                    styles.hueSlider,
                    {
                      backgroundColor: solidColor,
                      transform: [{ translateX: (hue / 360) * HUE_BAR_WIDTH }],
                    },
                  ]}
                />
              </View>

              {/* HEX input with copy */}
              <View style={styles.hexRow}>
                <Text style={styles.hexLabel}>HEX</Text>
                <View style={styles.hexInputWrap}>
                  <Text style={styles.hexInput} numberOfLines={1}>{hexValue}</Text>
                  <TouchableOpacity style={styles.hexCopyBtn} onPress={handleCopyHex}>
                    <Text style={styles.hexCopyText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.btns}>
              <TouchableOpacity style={styles.btnCancel} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnAdd} onPress={handleAdd} activeOpacity={0.8}>
                <Text style={styles.btnAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "85%",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a2e",
    marginBottom: 10,
  },
  fontRow: {
    marginBottom: 14,
    maxHeight: 44,
  },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  fontChipActive: {
    backgroundColor: "#e94560",
  },
  fontChipText: {
    fontSize: 13,
    color: "#333",
  },
  fontChipTextActive: {
    color: "#fff",
  },
  colorPickerWrap: {
    marginBottom: 16,
  },
  colorPickerRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    marginBottom: 12,
  },
  colorPreview: {
    width: PICKER_SIZE,
    height: PICKER_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  satValWrap: {
    width: PICKER_SIZE,
    height: PICKER_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  satValInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    overflow: "hidden",
  },
  slider: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SLIDER_SIZE,
    height: SLIDER_SIZE,
    borderRadius: SLIDER_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hueWrap: {
    width: HUE_BAR_WIDTH + SLIDER_SIZE,
    height: HUE_BAR_HEIGHT + SLIDER_SIZE,
    marginBottom: 12,
    position: "relative",
    justifyContent: "center",
  },
  hueBar: {
    position: "absolute",
    left: SLIDER_SIZE / 2,
    right: SLIDER_SIZE / 2,
    height: HUE_BAR_HEIGHT,
    borderRadius: 6,
    overflow: "hidden",
  },
  hueSlider: {
    position: "absolute",
    left: 0,
    top: (HUE_BAR_HEIGHT - SLIDER_SIZE) / 2,
    width: SLIDER_SIZE,
    height: SLIDER_SIZE,
    borderRadius: SLIDER_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hexLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    width: 28,
  },
  hexInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  hexInput: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a2e",
  },
  hexCopyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hexCopyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e94560",
  },
  btns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  btnAdd: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#e94560",
  },
  btnAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
