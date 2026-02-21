import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export function useUnreadNotificationCount(): number {
  const { user } = useAuth();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
  });
  return data?.count ?? 0;
}

type NotificationIconWithBadgeProps = {
  onPress?: () => void;
  color?: string;
  size?: number;
  focused?: boolean;
};

export function NotificationIconWithBadge({
  onPress,
  color = Colors.text,
  size = 22,
  focused,
}: NotificationIconWithBadgeProps) {
  const count = useUnreadNotificationCount();
  const icon = (
    <View style={styles.wrapper}>
      <Ionicons
        name={focused ? "notifications" : "notifications-outline"}
        size={size}
        color={color}
      />
      <View style={[styles.badge, count === 0 && styles.badgeZero]}>
        <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
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
