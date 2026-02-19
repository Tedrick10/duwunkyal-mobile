import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Switch,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getImageUrl } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors: C } = useTheme();

  const { data: orders, isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: C.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Profile</Text>
        </View>
        <View style={styles.center}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: C.surfaceSecondary }]}>
            <Ionicons name="person-outline" size={40} color={C.textLight} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Sign in to your account</Text>
          <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + webTopInset,
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Profile</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.profileCard,
          { backgroundColor: C.surface, borderColor: C.borderLight },
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/profile/details");
        }}
      >
        <View style={styles.avatar}>
          {user.photo_url ? (
            <Image
              source={{ uri: getImageUrl(user.photo_url) }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: C.text }]}>{user.name}</Text>
          <Text style={[styles.profileEmail, { color: C.textSecondary }]}>
            {user.phone || user.email || "—"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textLight} />
      </Pressable>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.menuItem, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile/edit");
          }}
        >
          <Ionicons name="pencil-outline" size={22} color={C.accent} />
          <Text style={[styles.menuItemText, { color: C.text, flex: 1 }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuItem, { backgroundColor: C.surface, borderColor: C.borderLight, marginTop: 10 }, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/orders");
          }}
        >
          <Ionicons name="receipt-outline" size={22} color={C.accent} />
          <Text style={[styles.menuItemText, { color: C.text, flex: 1 }]}>My Orders</Text>
          {orders !== undefined && orders.length > 0 && (
            <Text style={[styles.menuItemBadge, { color: C.textSecondary }]}>{orders.length}</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuItem, { backgroundColor: C.surface, borderColor: C.borderLight, marginTop: 10 }, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/wishlist");
          }}
        >
          <Ionicons name="heart-outline" size={22} color={C.accent} />
          <Text style={[styles.menuItemText, { color: C.text, flex: 1 }]}>Wishlist</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Appearance</Text>
        {/* <View style={[styles.menuItem, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Ionicons name={isDark ? "moon" : "sunny-outline"} size={22} color={C.accent} />
          <Text style={[styles.menuItemText, { color: C.text, flex: 1 }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }}
            trackColor={{ false: C.border, true: C.accent }}
            thumbColor={Colors.white}
          />
        </View> */}
      </View>

      <View style={styles.section}>
        <Pressable style={[styles.menuItem, { backgroundColor: C.surface, borderColor: C.borderLight }]} onPress={handleLogout}>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
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
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  profileInfo: { marginLeft: 14, flex: 1 },
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
  menuItemBadge: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginRight: 4,
  },
});
