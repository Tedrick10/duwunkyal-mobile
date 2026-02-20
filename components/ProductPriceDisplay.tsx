import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { formatPriceMMK } from "@/lib/format";

type Props = {
  price: number;
  salePrice?: number | null;
  size?: "small" | "default" | "large";
};

export function ProductPriceDisplay({ price, salePrice, size = "default" }: Props) {
  const hasSale = salePrice != null && salePrice < price;
  const displayPrice = hasSale ? salePrice : price;
  const fontSize = size === "small" ? 12 : size === "large" ? 22 : 14;

  if (hasSale) {
    return (
      <View style={styles.row}>
        <Text style={[styles.originalPrice, { fontSize }]}>{formatPriceMMK(price)}</Text>
        <Text style={[styles.salePrice, { fontSize }]}>{formatPriceMMK(displayPrice)}</Text>
      </View>
    );
  }

  return (
    <Text style={[styles.price, { fontSize }]}>{formatPriceMMK(price)}</Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  originalPrice: {
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textDecorationLine: "line-through",
    fontSize: 14,
  },
  salePrice: {
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    fontSize: 14,
  },
  price: {
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
});
