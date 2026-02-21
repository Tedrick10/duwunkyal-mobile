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
  Alert,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getProductImageSource, type ProductDetail, type ProductDetailColor } from "@/lib/query-client";
import { CartIconWithBadge } from "@/components/CartIconWithBadge";
import { formatPriceMMK } from "@/lib/format";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id, color: paramColor } = useLocalSearchParams<{ id: string; color?: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user } = useAuth();
  const initialColorSetRef = useRef(false);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saleType, setSaleType] = useState<"regular" | "rentals" | "wholesale">("regular");
  const [addedToCart, setAddedToCart] = useState(false);
  const [showRequiredAlert, setShowRequiredAlert] = useState(false);

  const { data: product, isLoading, isError, error } = useQuery<ProductDetail | null>({
    queryKey: ["productDetail", id],
  });

  const loginRequired = isError && (error as any)?.loginRequired === true;

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
      const qty = product?.stock != null ? Math.min(Math.max(quantity, effectiveMinQty), product.stock) : quantity;
      const base = effectivePrice;
      const colorDelta = Number(selectedColorObj?.price_delta ?? 0);
      const unitPrice = base + colorDelta;
      const productOverride =
        product && {
          id: product.id,
          name: product.name,
          price: String(unitPrice),
          image: selectedColorObj?.image_url ?? product.image_url ?? null,
          imageBack: (product as any)?.image_back_url ?? product.image_url ?? null,
        };
      await apiRequest("POST", "/api/cart", {
        productId: parseInt(id as string),
        quantity: qty,
        size: selectedSize,
        color: selectedColor,
        customPrice: String(unitPrice),
        productOverride,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    },
    onError: (err) => {
      Alert.alert("Add to Cart Failed", (err as Error).message);
    },
  });

  const sizes = product?.sizes?.map((s) => s.name) ?? [];
  const colors: ProductDetailColor[] = product?.colors ?? [];
  const selectedColorObj = colors.find((c) => c.name === selectedColor);

  const rentalsMin = product?.retail_min_qty ?? 1;
  const wholesaleMin = product?.wholesale_min_qty ?? 1;
  const canShowRentals = (product?.rentals_price != null) && (product?.rentals_price > 0);
  const canShowWholesale = (product?.wholesale_price != null) && (product?.wholesale_price > 0);
  const effectiveMinQty =
    saleType === "regular" ? 1 : saleType === "rentals" ? rentalsMin : wholesaleMin;
  const effectivePrice =
    saleType === "wholesale" && product?.wholesale_price != null
      ? Number(product.wholesale_price)
      : saleType === "rentals" && product?.rentals_price != null
        ? Number(product.rentals_price)
        : Number(product?.sale_price ?? product?.price ?? 0);

  useEffect(() => {
    initialColorSetRef.current = false;
  }, [id]);

  useEffect(() => {
    if (showRequiredAlert) {
      const t = setTimeout(() => setShowRequiredAlert(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showRequiredAlert]);

  useEffect(() => {
    if (!product) return;
    const min = effectiveMinQty;
    const max = product.stock;
    setQuantity((q) => Math.min(max, Math.max(min, q)));
  }, [saleType, product?.id, product?.stock, effectiveMinQty]);

  useEffect(() => {
    if (!product || initialColorSetRef.current || !paramColor?.trim()) return;
    const paramLower = paramColor.trim().toLowerCase();
    const match = product.colors?.find(
      (c) => c.name.trim().toLowerCase() === paramLower || (paramLower === "grey" && c.name.trim().toLowerCase() === "gray")
    );
    if (match) {
      const canonical = match.name.trim().toLowerCase() === "gray" ? "Grey" : match.name;
      setSelectedColor(canonical);
      initialColorSetRef.current = true;
    }
  }, [product, paramColor]);

  const sizeRequired = sizes.length > 0 && !selectedSize;
  const colorRequired = colors.length > 0 && !selectedColor;
  const canAddToCart = !sizeRequired && !colorRequired;

  function handleAddToCart() {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (sizeRequired || colorRequired) {
      setShowRequiredAlert(true);
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

  if (loginRequired) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={[styles.loadingContainer, { flex: 1, justifyContent: "center", gap: 16 }]}>
          <Ionicons name="lock-closed" size={48} color={Colors.accent} />
          <Text style={[styles.errorText, { textAlign: "center" }]}>
            Sign in to view this product
          </Text>
          <Text style={[styles.loadingText, { fontSize: 14 }]}>
            This product is only available to registered users.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Pressable
              style={[styles.addToCartBtn, { flex: 1 }]}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.addToCartText}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.addToCartBtn, { flex: 1, backgroundColor: Colors.surface }]}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={[styles.addToCartText, { color: Colors.accent }]}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={[styles.topBar, { top: insets.top + webTopInset }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <View style={[styles.loadingContainer, { flex: 1, justifyContent: "center", gap: 16, paddingHorizontal: 24 }]}>
          <Ionicons name="shirt-outline" size={48} color={Colors.textSecondary} />
          <Text style={[styles.errorText, { textAlign: "center" }]}>Product not found</Text>
          <Text style={[styles.loadingText, { fontSize: 14, textAlign: "center" }]}>
            This product may have been removed or is no longer available.
          </Text>
          <Pressable style={[styles.addToCartBtn, { marginTop: 8 }]} onPress={() => router.back()}>
            <Text style={styles.addToCartText}>Go Back</Text>
          </Pressable>
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
        <CartIconWithBadge
          onPress={() => router.push("/(tabs)/cart")}
          color={Colors.text}
          size={22}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.imageSection}>
          <Image
            source={getProductImageSource(selectedColorObj?.image_url ?? product.image_url ?? null)}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.saleTypeSection}>
            <Text style={styles.optionLabel}>Sale Type</Text>
            <View style={styles.saleTypeRow}>
              <Pressable
                style={[styles.saleTypeChip, saleType === "regular" && styles.saleTypeChipActive]}
                onPress={() => {
                  setSaleType("regular");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.saleTypeChipText, saleType === "regular" && styles.saleTypeChipTextActive]}>
                  Regular Sales
                </Text>
              </Pressable>
              {canShowRentals && (
                <Pressable
                  style={[styles.saleTypeChip, saleType === "rentals" && styles.saleTypeChipActive]}
                  onPress={() => {
                    setSaleType("rentals");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.saleTypeChipText, saleType === "rentals" && styles.saleTypeChipTextActive]}>
                    Retails
                  </Text>
                </Pressable>
              )}
              {canShowWholesale && (
                <Pressable
                  style={[styles.saleTypeChip, saleType === "wholesale" && styles.saleTypeChipActive]}
                  onPress={() => {
                    setSaleType("wholesale");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.saleTypeChipText, saleType === "wholesale" && styles.saleTypeChipTextActive]}>
                    Wholesale
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {saleType === "regular"
                ? "Regular Sales"
                : saleType === "rentals"
                  ? "Retails"
                  : "Wholesale"}{" "}
              Price
            </Text>
            {saleType === "regular" && product.sale_price != null && product.sale_price < product.price ? (
              <View style={styles.priceDisplayRow}>
                <ProductPriceDisplay price={product.price} salePrice={product.sale_price} size="large" />
              </View>
            ) : (
              <Text style={styles.priceValue}>{formatPriceMMK(effectivePrice)}</Text>
            )}
            <Text style={styles.minQtyHint}>Min. order: {effectiveMinQty} {effectiveMinQty === 1 ? "item" : "items"}</Text>
          </View>


          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {sizes.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Size *</Text>
              <View style={styles.optionRow}>
                {sizes.map((size) => (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeChip,
                      selectedSize === size && styles.sizeChipActive,
                    ]}
                    onPress={() => {
                      setSelectedSize(size);
                      setShowRequiredAlert(false);
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
              <Text style={styles.optionLabel}>Color *</Text>
              <View style={styles.colorSwatchRow}>
                {colors.map((color) => {
                  const hex = color.hex || "#9e9e9e";
                  const isSelected = selectedColor === color.name;
                  return (
                    <Pressable
                      key={color.id}
                      style={[
                        styles.colorSwatchOuter,
                        isSelected && styles.colorSwatchOuterActive,
                      ]}
                      onPress={() => {
                        setSelectedColor(color.name);
                        setShowRequiredAlert(false);
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
            <Text style={styles.optionLabel}>Quantity (min. {effectiveMinQty})</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={[styles.qtyBtn, quantity <= effectiveMinQty && styles.qtyBtnDisabled]}
                disabled={quantity <= effectiveMinQty}
                onPress={() => {
                  if (quantity > effectiveMinQty) {
                    setQuantity(quantity - 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Ionicons name="remove" size={18} color={quantity <= effectiveMinQty ? Colors.textSecondary : Colors.text} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable
                style={[styles.qtyBtn, quantity >= product.stock && styles.qtyBtnDisabled]}
                disabled={quantity >= product.stock}
                onPress={() => {
                  const max = product?.stock ?? 99;
                  if (quantity < max) {
                    setQuantity(quantity + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Ionicons name="add" size={18} color={quantity >= (product?.stock ?? 0) ? Colors.textSecondary : Colors.text} />
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

          {(product.customize_enabled ?? !!product.customize) && (
            <Pressable
              style={({ pressed }) => [styles.customizeBtn, pressed && { opacity: 0.9 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const image = product.customize?.front_image_url ?? product.image_url;
                const imageBack = product.customize?.back_image_url ?? product.image_url;
                router.push({ pathname: "/customize/[id]", params: { id: id as string, image, imageBack } });
              }}
            >
              <MaterialCommunityIcons name="tshirt-crew-outline" size={20} color={Colors.white} />
              <Text style={styles.customizeBtnText}>Customize Design</Text>
            </Pressable>
          )}
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
            {formatPriceMMK(
              (effectivePrice + Number(selectedColorObj?.price_delta ?? 0)) * quantity
            )}
          </Text>
        </View>
        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [styles.wishlistIconBtn, pressed && { opacity: 0.8 }]}
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
              size={24}
              color={wishlisted ? Colors.accent : Colors.text}
            />
          </Pressable>
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

      {showRequiredAlert && (
        <View style={[styles.requiredAlertBanner, { bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 }]}>
          <Text style={styles.requiredAlertText}>Please choose size or color</Text>
        </View>
      )}
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
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wishlistIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
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
  saleTypeSection: {
    marginBottom: 16,
  },
  saleTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  saleTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  saleTypeChipActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}15`,
  },
  saleTypeChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  saleTypeChipTextActive: {
    color: Colors.accent,
  },
  priceRow: {
    marginBottom: 12,
  },
  priceDisplayRow: {
    marginVertical: 2,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  minQtyHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  extraPricesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
  },
  extraPriceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  extraPriceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  extraPriceValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
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
  requiredAlertBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: Colors.error,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  requiredAlertText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textAlign: "center",
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
  qtyBtnDisabled: {
    opacity: 0.6,
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
