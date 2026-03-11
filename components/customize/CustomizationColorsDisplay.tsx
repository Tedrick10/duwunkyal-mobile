import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Extract body/sleeve/collar/cuff colors from customization (camelCase or snake_case). */
export function getCustomizationColors(c: Record<string, unknown> | null | undefined) {
  if (!c || typeof c !== "object") return null;
  const get = (...keys: string[]) =>
    keys.reduce<unknown>((v, k) => v ?? (c as Record<string, unknown>)[k], undefined);
  const toHex = (v: unknown): string | undefined => {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return s.startsWith("#") ? s : `#${s.replace(/^#/, "")}`;
  };
  const body = toHex(get("bodyColor", "body_color"));
  const sleeve = toHex(get("sleeveColor", "sleeve_color"));
  const collar = toHex(get("collarColor", "collar_color"));
  const cuff = toHex(get("cuffColor", "cuff_color"));
  if (!body && !sleeve && !collar && !cuff) return null;
  return { body, sleeve, collar, cuff };
}

type Props = {
  customization: Record<string, unknown> | null | undefined;
  /** Use "Neckline" instead of "Collar" for crew_neck products */
  neckLabel?: "Collar" | "Neckline";
  /** Compact = smaller swatches, inline. Default false = vertical row with labels */
  compact?: boolean;
  /** Remove top margin when inside a section with its own padding */
  noMargin?: boolean;
};

export function CustomizationColorsDisplay({
  customization,
  neckLabel = "Collar",
  compact = false,
  noMargin = false,
}: Props) {
  const colors = getCustomizationColors(customization);
  if (!colors || (!colors.body && !colors.sleeve && !colors.collar && !colors.cuff)) return null;

  const items = [
    { key: "body", label: "Body", color: colors.body },
    { key: "sleeve", label: "Sleeves", color: colors.sleeve },
    { key: "collar", label: neckLabel, color: colors.collar },
    { key: "cuff", label: "Cut off", color: colors.cuff },
  ].filter((i) => i.color);

  if (items.length === 0) return null;

  if (compact) {
    return (
      <View style={[styles.compactRow, noMargin && styles.compactRowNoMargin]}>
        {items.map(({ key, label, color }) => (
          <View key={key} style={styles.compactItem}>
            <View style={[styles.swatchSmall, { backgroundColor: color }]} />
            <Text style={styles.compactLabel}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.colorRow, noMargin && styles.colorRowNoMargin]}>
      {items.map(({ key, label, color }) => (
        <View key={key} style={styles.colorItem}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.colorText}>{label}: {color}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: "column",
    gap: 4,
    marginTop: 6,
  },
  colorRowNoMargin: { marginTop: 0 },
  colorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  compactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  compactRowNoMargin: { marginTop: 0 },
  compactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swatchSmall: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  compactLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
});
