import React, { useRef, useEffect, useCallback, useState } from "react";
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
  RefreshControl,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { type CategoryItem, type ProductListItem } from "@/lib/query-client";
import { apiMobileUrl } from "@/lib/api-config";
import { NotificationIconWithBadge } from "@/components/NotificationIconWithBadge";

export type BannerItem = { id: number; image_url: string };

const { width } = Dimensions.get("window");
const H_PADDING = 20;
const BANNER_WIDTH = width - H_PADDING * 2;
const BANNER_HEIGHT = 180;
const BANNER_GAP = 16;
const AUTO_SCROLL_INTERVAL = 4500;
const SECTION_SPACING = 32;
const CARD_GAP = 14;
const PRODUCT_CARD_WIDTH = 148;
const CATEGORY_SIZE = 80;

function BannerDot({ index, activeIndex, accentColor }: { index: number; activeIndex: number; accentColor: string }) {
  const dotStyle = useAnimatedStyle(() => {
    const isActive = activeIndex === index;
    return {
      width: withTiming(isActive ? 18 : 6, { duration: 200 }),
      height: 6,
      borderRadius: 3,
      opacity: withTiming(isActive ? 1 : 0.35, { duration: 200 }),
      backgroundColor: isActive ? accentColor : "#c0c4cc",
    };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bannerRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracting = useRef(false);

  const { data: categoryData, isLoading: loadingCategories, refetch: refetchCategories } = useQuery<{ categories: CategoryItem[] }>({
    queryKey: ["categoryList"],
  });
  const categories: CategoryItem[] = categoryData?.categories ?? [];

  const { data: productListData, isLoading: loadingProductList, refetch: refetchProductList } = useQuery<{
    products: ProductListItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>({
    queryKey: ["productList"],
  });
  const products: ProductListItem[] = productListData?.products ?? [];

  const { data: featuredProductListData, isLoading: loadingFeaturedProductList, refetch: refetchFeaturedProductList } = useQuery<{
    products: ProductListItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>({
    queryKey: ["featuredProductList"],
  });
  const hotProducts: ProductListItem[] = featuredProductListData?.products ?? [];
  const customizeProducts: ProductListItem[] = products.filter((p) => p.customize_enabled === true);

  const { data: bannerData, refetch: refetchBanners } = useQuery<{ banners: BannerItem[] }>({
    queryKey: ["bannerList"],
    queryFn: async () => {
      const res = await fetch(apiMobileUrl("bannerList"), {
        method: "GET",
        headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
      });
      if (!res.ok) throw new Error("Banner list failed");
      const json = await res.json();
      return { banners: json.banners ?? [] };
    },
  });

  const isLoading = loadingCategories || loadingProductList || loadingFeaturedProductList;
  const bannerItems: BannerItem[] = bannerData?.banners ?? [];

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      if (userInteracting.current || !bannerRef.current || bannerItems.length <= 1) return;
      setActiveSlide((prev) => {
        const next = (prev + 1) % bannerItems.length;
        bannerRef.current?.scrollToOffset({ offset: next * (BANNER_WIDTH + BANNER_GAP), animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [bannerItems.length]);

  useEffect(() => {
    if (bannerItems.length > 1) startAutoScroll();
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [bannerItems.length, startAutoScroll]);

  const onBannerScrollBegin = useCallback(() => {
    userInteracting.current = true;
  }, []);

  const onBannerScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      userInteracting.current = false;
      const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP));
      setActiveSlide(idx);
      startAutoScroll();
    },
    [startAutoScroll]
  );

  function onRefresh() {
    refetchCategories();
    refetchProductList();
    refetchFeaturedProductList();
    refetchBanners();
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset, backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  const renderBannerItem = ({ item }: { item: BannerItem }) => (
    <View style={styles.heroBanner}>
      <Image source={{ uri: item.image_url }} style={styles.heroImage} resizeMode="cover" />
    </View>
  );

  const sectionContainerStyle = [styles.section, { marginBottom: SECTION_SPACING }];
  const horizontalPadding = { paddingHorizontal: H_PADDING };
  const productCardStyle = { width: PRODUCT_CARD_WIDTH };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + webTopInset }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={[styles.header, horizontalPadding]}>
        <View>
          <Text style={[styles.greeting, { color: C.textSecondary }]}>
            {user ? `Hi, ${user.name.split(" ")[0]}` : "Welcome"}
          </Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>Duwun Kyal</Text>
        </View>
        <Pressable
          style={[styles.notifBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => {
            if (!user) router.push("/(auth)/login");
            else router.push("/notifications");
          }}
        >
          {user ? (
            <NotificationIconWithBadge color={C.text} />
          ) : (
            <Ionicons name="person-outline" size={22} color={C.text} />
          )}
        </Pressable>
      </View>

      {/* Banner */}
      {bannerItems.length > 0 && (
        <View style={sectionContainerStyle}>
          <FlatList
            ref={bannerRef}
            data={bannerItems}
            renderItem={renderBannerItem}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH + BANNER_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={[styles.bannerList, horizontalPadding]}
            ItemSeparatorComponent={() => <View style={{ width: BANNER_GAP }} />}
            onScrollBeginDrag={onBannerScrollBegin}
            onMomentumScrollEnd={onBannerScrollEnd}
            onScrollEndDrag={onBannerScrollEnd}
            getItemLayout={(_, index) => ({
              length: BANNER_WIDTH + BANNER_GAP,
              offset: (BANNER_WIDTH + BANNER_GAP) * index,
              index,
            })}
          />
          {bannerItems.length > 1 && (
            <View style={styles.dotsRow}>
              {bannerItems.map((_: any, i: number) => (
                <BannerDot key={i} index={i} activeIndex={activeSlide} accentColor={C.accent} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <View style={sectionContainerStyle}>
          <View style={[styles.sectionHeader, horizontalPadding]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, horizontalPadding, { gap: CARD_GAP }]}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.categoryChip, { backgroundColor: C.surface, borderColor: C.border }, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id.toString() } })}
              >
                {cat.image_url ? (
                  <View style={[styles.categoryChipImageWrap, { backgroundColor: C.productImageBg ?? "#f5f5f5" }]}>
                    <Image source={{ uri: cat.image_url }} style={styles.categoryChipImage} resizeMode="contain" />
                  </View>
                ) : null}
                <Text style={[styles.categoryChipText, { color: C.text }]} numberOfLines={1}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Hot Products */}
      {hotProducts.length > 0 && (
        <View style={sectionContainerStyle}>
          <View style={[styles.sectionHeader, horizontalPadding]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Hot Products</Text>
            <Ionicons name="flame" size={18} color={Colors.accent} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, horizontalPadding, { gap: CARD_GAP, paddingRight: H_PADDING }]}>
            {hotProducts.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, productCardStyle, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={[styles.productCardImage, { backgroundColor: C.productImageBg ?? "#f5f5f5" }]}>
                  <Image source={{ uri: product.image_url }} style={styles.productCardImg} resizeMode="contain" />
                </View>
                <Text style={[styles.productCardName, { color: C.text }]} numberOfLines={2}>{product.name}</Text>
                <View style={styles.productCardPrice}>
                  <ProductPriceDisplay price={product.price} salePrice={product.sale_price} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Customize Clothes */}
      {customizeProducts.length > 0 && (
        <View style={sectionContainerStyle}>
          <View style={[styles.sectionHeader, horizontalPadding]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Customize Clothes</Text>
            <Ionicons name="brush-outline" size={18} color={C.textSecondary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, horizontalPadding, { gap: CARD_GAP, paddingRight: H_PADDING }]}>
            {customizeProducts.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, productCardStyle, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={[styles.productCardImage, { backgroundColor: C.productImageBg ?? "#f5f5f5" }]}>
                  <Image source={{ uri: product.image_url }} style={styles.productCardImg} resizeMode="contain" />
                </View>
                <Text style={[styles.productCardName, { color: C.text }]} numberOfLines={2}>{product.name}</Text>
                <View style={styles.productCardPrice}>
                  <ProductPriceDisplay price={product.price} salePrice={product.sale_price} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* All Products */}
      {products.length > 0 && (
        <View style={sectionContainerStyle}>
          <View style={[styles.sectionHeader, horizontalPadding]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>All Products</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, horizontalPadding, { gap: CARD_GAP, paddingRight: H_PADDING }]}>
            {products.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, productCardStyle, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={[styles.productCardImage, { backgroundColor: C.productImageBg ?? "#f5f5f5" }]}>
                  <Image source={{ uri: product.image_url }} style={styles.productCardImg} resizeMode="contain" />
                </View>
                <Text style={[styles.productCardName, { color: C.text }]} numberOfLines={2}>{product.name}</Text>
                <View style={styles.productCardPrice}>
                  <ProductPriceDisplay price={product.price} salePrice={product.sale_price} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: "capitalize",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  heroBanner: {
    width: BANNER_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    height: BANNER_HEIGHT,
    ...cardShadow,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  bannerList: {
    paddingVertical: 6,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    borderRadius: 3,
  },
  horizontalList: {
    flexDirection: "row",
    paddingVertical: 16,
  },
  pressed: { opacity: 0.88 },
  categoryChip: {
    width: CATEGORY_SIZE + 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...cardShadow,
  },
  categoryChipImageWrap: {
    width: CATEGORY_SIZE,
    height: CATEGORY_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryChipImage: {
    width: CATEGORY_SIZE - 12,
    height: CATEGORY_SIZE - 12,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...cardShadow,
  },
  productCardImage: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    height: PRODUCT_CARD_WIDTH,
  },
  productCardImg: {
    width: "100%",
    height: "100%",
  },
  productCardName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    paddingHorizontal: 10,
    paddingTop: 10,
    lineHeight: 18,
  },
  productCardPrice: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
});
