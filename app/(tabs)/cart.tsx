import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { apiRequest, queryClient, getProductImageSource } from "@/lib/query-client";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();
  const { colors: C } = useTheme();

  const { data: cartItems, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      await apiRequest("PUT", `/api/cart/${id}`, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cart/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
  });

  const total = cartItems
    ? cartItems.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0)
    : 0;

  function handleQuantity(item: any, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemove(item.id);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMutation.mutate({ id: item.id, quantity: newQty });
  }

  function handleRemove(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeMutation.mutate(id);
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: C.background }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={56} color={C.textLight} />
          <Text style={styles.emptyTitle}>Sign in to view your cart</Text>
          <Pressable
            style={styles.signInBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderCartItem({ item }: { item: any }) {
    return (
      <View style={[styles.cartItem, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/product/[id]",
              params: { id: item.productId.toString() },
            })
          }
        >
          <Image source={getProductImageSource(item.product.image)} style={[styles.cartItemImage, { backgroundColor: C.productImageBg }]} />
        </Pressable>
        <View style={styles.cartItemInfo}>
          <Text style={[styles.cartItemName, { color: C.text }]} numberOfLines={2}>
            {item.product.name}
          </Text>
          {(item.size || item.color) && (
            <Text style={[styles.cartItemVariant, { color: C.textSecondary }]}>
              {[item.size, item.color].filter(Boolean).join(" / ")}
            </Text>
          )}
          <Text style={styles.cartItemPrice}>
            ${parseFloat(item.product.price).toFixed(2)}
          </Text>
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: C.surfaceSecondary }]}
              onPress={() => handleQuantity(item, -1)}
            >
              <Ionicons name="remove" size={16} color={C.text} />
            </Pressable>
            <Text style={[styles.qtyText, { color: C.text }]}>{item.quantity}</Text>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: C.surfaceSecondary }]}
              onPress={() => handleQuantity(item, 1)}
            >
              <Ionicons name="add" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>
        <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
          <Ionicons name="close" size={18} color={C.textLight} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: C.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Cart</Text>
        {cartItems && cartItems.length > 0 && (
          <Text style={[styles.itemCount, { color: C.textSecondary }]}>{cartItems.length} items</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: C.textSecondary }}>Loading...</Text>
        </View>
      ) : !cartItems || cartItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={56} color={C.textLight} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Start adding items to your cart</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80, backgroundColor: C.surface, borderTopColor: C.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Total</Text>
              <Text style={[styles.totalValue, { color: C.text }]}>${total.toFixed(2)}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push("/checkout")}
            >
              <Text style={styles.checkoutBtnText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  itemCount: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
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
  list: { paddingHorizontal: 20, paddingBottom: 220 },
  cartItem: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...cardShadow,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.productImageBg,
    resizeMode: "contain",
  },
  cartItemInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  cartItemName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  cartItemVariant: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    marginBottom: 6,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    padding: 4,
    position: "absolute",
    top: 8,
    right: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 18,
    ...cardShadow,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  checkoutBtn: {
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
    borderRadius: 14,
    gap: 8,
    ...cardShadow,
  },
  checkoutBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
