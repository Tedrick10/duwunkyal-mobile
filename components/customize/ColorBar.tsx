import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { TSHIRT_COLORS } from "./types";

type Props = {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  /** When provided (e.g. from productCustomization API), use these instead of default TSHIRT_COLORS. */
  colors?: Array<{ hex: string; name?: string }>;
};

export function ColorBar({ selectedColor, onSelectColor, colors: colorsProp }: Props) {
  const colors = colorsProp?.length ? colorsProp.map((c) => c.hex) : [...TSHIRT_COLORS];
  return (
    <View style={styles.bar}>
      {colors.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.opt,
            { backgroundColor: color },
            selectedColor === color && styles.optActive,
          ]}
          onPress={() => onSelectColor(color)}
          activeOpacity={0.8}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: [{ translateY: -78 }],
    zIndex: 10,
    gap: 6,
  },
  opt: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  optActive: {
    borderColor: "#e94560",
  },
});
