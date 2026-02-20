import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export function useCartQuantity(): number {
  const { user } = useAuth();
  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });
  if (!cartItems || cartItems.length === 0) return 0;
  return cartItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}

type CartIconWithBadgeProps = {
  onPress?: () => void;
  color?: string;
  size?: number;
};

export function CartIconWithBadge({ onPress, color = Colors.text, size = 22 }: CartIconWithBadgeProps) {
  const quantity = useCartQuantity();
  const icon = (
    <View style={styles.wrapper}>
      <Ionicons name="bag-outline" size={size} color={color} />
      <View style={[styles.badge, quantity === 0 && styles.badgeZero]}>
        <Text style={styles.badgeText}>{quantity}</Text>
      </View>
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {icon}
      </Pressable>
    );
  }
  return icon;
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" as const },
  badge: {
    position: "absolute" as const,
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  badgeZero: { backgroundColor: Colors.textLight },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
});
