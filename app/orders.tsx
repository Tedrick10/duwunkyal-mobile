import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { formatPriceMMK } from "@/lib/format";

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

export default function OrdersScreen() {
  // const insets = useSafeAreaInsets();
  // const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconOuter}>
          <LinearGradient
            colors={["#e8e8e8", "#d0d0d0"]}
            style={styles.emptyIconCircle}
          >
            <Ionicons name="receipt-outline" size={48} color="#b0b0b0" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>My Orders</Text>
        <Text style={styles.emptySubtitle}>
          {!user
            ? "Sign in to see your orders"
            : "No orders yet. Start shopping to place your first order."}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.returnBtn, pressed && { opacity: 0.9 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.returnBtnText}>
            {!user ? "Return to shop" : "Continue shopping"}
          </Text>
        </Pressable>
        {!user && (
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderItem({ item }: { item: any }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.9 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/order/[id]",
            params: { id: item.id.toString() },
          });
        }}
      >
        <View style={styles.orderCardTop}>
          <Text style={styles.orderNumber}>{item.number ?? `Order #${item.id}`}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}20` },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.orderCardBottom}>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.orderTotal}>
            {formatPriceMMK(item.total)}
          </Text>
        </View>
      </Pressable>
    );
  }

  const showEmpty = !user || !orders || orders.length === 0;

  return (
    <View style={styles.container}>
      {/* <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerBtn} />
      </View> */}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : showEmpty ? (
        renderEmpty()
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconOuter: {
    marginBottom: 12,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  returnBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  returnBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
});
