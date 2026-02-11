import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getImageUrl, getProductImageSource, getTshirtImageForColor } from "@/lib/query-client";

const { width } = Dimensions.get("window");

/** Map color names (e.g. White, Black, Green, Blue) to hex for swatch display. */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  White: "#ffffff",
  Black: "#000000",
  Green: "#2e7d32",
  Blue: "#1976d2",
  Red: "#c62828",
  Navy: "#1a237e",
  Grey: "#616161",
  Pink: "#ad1457",
  Yellow: "#f9a825",
  Orange: "#ef6c00",
  Beige: "#d7ccc8",
  Brown: "#5d4037",
};

function getColorHex(name: string): string {
  const key = name.trim();
  if (key.startsWith("#")) return key;
  const lower = key.toLowerCase();
  const found = Object.entries(COLOR_NAME_TO_HEX).find(([k]) => k.toLowerCase() === lower);
  return found ? found[1] : "#9e9e9e";
}

export default function ProductDetailScreen() {
  const { id, color: paramColor } = useLocalSearchParams<{ id: string; color?: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();
  const initialColorSetRef = useRef(false);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ["/api/products", id],
  });

  const { data: wishlistStatus } = useQuery<{ inWishlist: boolean }>({
    queryKey: ["/api/wishlist/check", id],
    enabled: !!user,
  });

  const wishlisted = wishlistStatus?.inWishlist ?? false;

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (wishlisted) {
        await apiRequest("DELETE", `/api/wishlist/${id}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { productId: parseInt(id as string) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist/check", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cart", {
        productId: parseInt(id as string),
        quantity,
        size: selectedSize,
        color: selectedColor,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    },
  });

  const sizes = product?.sizes ? product.sizes.split(",").map((s: string) => s.trim()) : [];
  const colors = product?.colors ? product.colors.split(",").map((c: string) => c.trim()) : [];

  useEffect(() => {
    initialColorSetRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!product || initialColorSetRef.current || !paramColor?.trim()) return;
    const productColors = product.colors ? product.colors.split(",").map((c: string) => c.trim()) : [];
    const paramLower = paramColor.trim().toLowerCase();
    const match = productColors.find(
      (c: string) => c.trim().toLowerCase() === paramLower || (paramLower === "grey" && c.trim().toLowerCase() === "gray")
    );
    if (match) {
      const canonical = match.trim().toLowerCase() === "gray" ? "Grey" : match;
      setSelectedColor(canonical);
      initialColorSetRef.current = true;
    }
  }, [product, paramColor]);

  function handleAddToCart() {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    addToCartMutation.mutate();
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { top: insets.top + webTopInset }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push("/(tabs)/cart")}
        >
          <Ionicons name="bag-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.imageSection}>
          <Image
            source={
              (selectedColor ? getTshirtImageForColor(selectedColor) : null) ??
              getProductImageSource(product.image)
            }
            style={styles.productImage}
            resizeMode="contain"
          />
          <Pressable
            style={styles.wishlistBtn}
            onPress={() => {
              if (!user) {
                router.push("/(auth)/login");
                return;
              }
              toggleWishlistMutation.mutate();
            }}
          >
            <Ionicons
              name={wishlisted ? "heart" : "heart-outline"}
              size={22}
              color={wishlisted ? Colors.accent : Colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            ${parseFloat(product.price).toFixed(2)}
          </Text>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {sizes.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Size</Text>
              <View style={styles.optionRow}>
                {sizes.map((size: string) => (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeChip,
                      selectedSize === size && styles.sizeChipActive,
                    ]}
                    onPress={() => {
                      setSelectedSize(size);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        selectedSize === size && styles.sizeChipTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {colors.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Color</Text>
              <View style={styles.colorSwatchRow}>
                {colors.map((color: string) => {
                  const hex = getColorHex(color);
                  const isSelected = selectedColor === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatchOuter,
                        isSelected && styles.colorSwatchOuterActive,
                      ]}
                      onPress={() => {
                        setSelectedColor(color);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: hex },
                          hex.toLowerCase() === "#ffffff" && styles.colorSwatchWhite,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.optionSection}>
            <Text style={styles.optionLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  if (quantity > 1) {
                    setQuantity(quantity - 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Ionicons name="remove" size={18} color={Colors.text} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  setQuantity(quantity + 1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="add" size={18} color={Colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.stockRow}>
            <Ionicons
              name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
              size={16}
              color={product.stock > 0 ? Colors.success : Colors.error}
            />
            <Text
              style={[
                styles.stockText,
                { color: product.stock > 0 ? Colors.success : Colors.error },
              ]}
            >
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.customizeBtn, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/customize/[id]", params: { id: id as string, image: product.image, imageBack: product.imageBack || "" } });
            }}
          >
            <MaterialCommunityIcons name="tshirt-crew-outline" size={20} color={Colors.white} />
            <Text style={styles.customizeBtnText}>Customize Design</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 },
        ]}
      >
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPriceValue}>
            ${(parseFloat(product.price) * quantity).toFixed(2)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addToCartBtn,
            pressed && { opacity: 0.9 },
            addedToCart && styles.addedBtn,
            product.stock <= 0 && styles.disabledBtn,
          ]}
          onPress={handleAddToCart}
          disabled={product.stock <= 0 || addToCartMutation.isPending}
        >
          {addToCartMutation.isPending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : addedToCart ? (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.addToCartText}>Added!</Text>
            </>
          ) : (
            <>
              <Ionicons name="bag-add-outline" size={20} color={Colors.white} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageSection: {
    backgroundColor: Colors.productImageBg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingTop: 80,
    ...cardShadow,
  },
  wishlistBtn: {
    position: "absolute",
    bottom: 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  productImage: {
    width: width * 0.7,
    height: width * 0.7,
    resizeMode: "contain",
  },
  infoSection: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  optionSection: { marginBottom: 20 },
  optionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sizeChipActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}10`,
  },
  sizeChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sizeChipTextActive: { color: Colors.accent },
  colorSwatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  colorSwatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 3,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchOuterActive: {
    borderColor: Colors.accent,
    borderWidth: 2.5,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorSwatchWhite: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    minWidth: 24,
    textAlign: "center",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  customizeBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  customizeBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
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
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...cardShadow,
  },
  bottomPrice: { flex: 1 },
  bottomPriceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addToCartBtn: {
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
    minHeight: 52,
    borderRadius: 14,
    gap: 8,
  },
  addedBtn: { backgroundColor: Colors.success },
  disabledBtn: { opacity: 0.5 },
  addToCartText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
