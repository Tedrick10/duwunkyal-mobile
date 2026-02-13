import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  Platform,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getProductImageSource } from "@/lib/query-client";
import { formatPriceMMK } from "@/lib/format";

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();

  const { data: wishlist, isLoading } = useQuery<any[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const cartCount = cartItems?.length ?? 0;

  const removeWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist/check"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconOuter}>
          <LinearGradient
            colors={["#e8e8e8", "#d0d0d0"]}
            style={styles.emptyIconCircle}
          >
            <Ionicons name="heart" size={48} color="#b0b0b0" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>Wishlist</Text>
        <Text style={styles.emptySubtitle}>
          Simply sign in to pick up where you left off
        </Text>
        <Pressable
          style={({ pressed }) => [styles.returnBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.returnBtnText}>Return to shop</Text>
        </Pressable>
      </View>
    );
  }

  function renderItem({ item }: { item: any }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.9 }]}
        onPress={() =>
          router.push({
            pathname: "/product/[id]",
            params: { id: item.product.id.toString() },
          })
        }
      >
        <Image
          source={getProductImageSource(item.product.image)}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.product.name}
          </Text>
          <Text style={styles.itemPrice}>
            {formatPriceMMK(item.product.price)}
          </Text>
        </View>
        <Pressable
          style={styles.removeBtn}
          onPress={() => removeWishlistMutation.mutate(item.product.id)}
        >
          <Ionicons name="heart" size={22} color={Colors.accent} />
        </Pressable>
      </Pressable>
    );
  }

  const showEmpty = !user || !wishlist || wishlist.length === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.push("/(tabs)/cart")}
        >
          <Ionicons name="bag-outline" size={22} color={Colors.white} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showEmpty ? (
        renderEmpty()
      ) : (
        <FlatList
          data={wishlist}
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
  cartBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    backgroundColor: Colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: Colors.white,
    resizeMode: "contain",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
