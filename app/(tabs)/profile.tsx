import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, logout } = useAuth();

  const { data: orders, isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={40} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to your account</Text>
          <Text style={styles.emptySubtitle}>
            Track orders, save favorites, and more
          </Text>
          <Pressable
            style={styles.signInBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.registerLink}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "pending": return Colors.warning;
      case "confirmed": return "#2196F3";
      case "shipped": return "#4CAF50";
      case "delivered": return "#9C27B0";
      case "cancelled": return Colors.error;
      default: return Colors.textSecondary;
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + webTopInset,
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          My Orders {orders ? `(${orders.length})` : ""}
        </Text>
        {loadingOrders ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={Colors.accent} />
        ) : !orders || orders.length === 0 ? (
          <View style={styles.emptyOrders}>
            <Ionicons name="receipt-outline" size={36} color={Colors.textLight} />
            <Text style={styles.emptyOrdersText}>No orders yet</Text>
          </View>
        ) : (
          orders.map((order: any) => (
            <Pressable
              key={order.id}
              style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.9 }]}
              onPress={() =>
                router.push({
                  pathname: "/order/[id]",
                  params: { id: order.id.toString() },
                })
              }
            >
              <View style={styles.orderCardTop}>
                <Text style={styles.orderNumber}>Order #{order.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(order.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>
              <View style={styles.orderCardBottom}>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.orderTotal}>
                  ${parseFloat(order.total).toFixed(2)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/wishlist");
          }}
        >
          <Ionicons name="heart-outline" size={22} color={Colors.accent} />
          <Text style={[styles.menuItemText, { color: Colors.text }]}>Wishlist</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={[styles.menuItemText, { color: Colors.error }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  signInBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  signInBtnText: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  registerLink: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  profileInfo: { marginLeft: 14 },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  emptyOrders: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyOrdersText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize" as const,
  },
  orderCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
