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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { formatPriceMMK } from "@/lib/format";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { type CategoryItem, type ProductListItem } from "@/lib/query-client";
import { apiMobileUrl } from "@/lib/api-config";
import { NotificationIconWithBadge } from "@/components/NotificationIconWithBadge";

export type BannerItem = { id: number; image_url: string };

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 12) / 2;
const BANNER_WIDTH = width - 40;
const BANNER_HEIGHT = 200;
const BANNER_GAP = 12;
const AUTO_SCROLL_INTERVAL = 4000;

function BannerDot({ index, activeIndex, accentColor }: { index: number; activeIndex: number; accentColor: string }) {
  const dotStyle = useAnimatedStyle(() => {
    const isActive = activeIndex === index;
    return {
      width: withTiming(isActive ? 20 : 8, { duration: 250 }),
      height: 8,
      borderRadius: 4,
      opacity: withTiming(isActive ? 1 : 0.4, { duration: 250 }),
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

  const { data: bannerData, refetch: refetchBanners } = useQuery<{ banners: BannerItem[] }>({
    queryKey: ["bannerList"],
    queryFn: async () => {
      const res = await fetch(apiMobileUrl("bannerList"), {
        method: "GET",
        headers: { Accept: "application/json" },
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + webTopInset }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: C.textSecondary }]}>
            {user ? `Hi, ${user.name.split(" ")[0]}` : "Welcome"}
          </Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>DUWUN KYAL</Text>
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

      {bannerItems.length > 0 && (
        <View style={styles.section}>
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
            contentContainerStyle={[styles.bannerList, { paddingHorizontal: 20 }]}
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

      {categories && categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.categoryChip, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.85 }]}
                onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id.toString() } })}
              >
                {cat.image_url ? (
                  <View style={[styles.categoryChipImageWrap, { backgroundColor: C.productImageBg ?? "#ffffff" }]}>
                    <Image source={{ uri: cat.image_url }} style={styles.categoryChipImage} resizeMode="contain" />
                  </View>
                ) : null}
                <Text style={[styles.categoryChipText, { color: C.text }]} numberOfLines={1}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {hotProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Hot Product List</Text>
            <Ionicons name="flame" size={18} color={Colors.accent} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {hotProducts.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.featuredCard, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && { opacity: 0.9 }]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={[styles.featuredImageContainer, { backgroundColor: C.surface }]}>
                  <Image source={{ uri: product.image_url }} style={styles.featuredImage} resizeMode="contain" />
                </View>
                <Text style={[styles.featuredName, { color: C.text }]} numberOfLines={1}>{product.name}</Text>
                <View style={styles.featuredPrice}>
                  <ProductPriceDisplay price={product.price} salePrice={product.sale_price} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {products.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>All Products</Text>
          </View>
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, { backgroundColor: C.surface, borderColor: C.borderLight }, pressed && { opacity: 0.9 }]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={[styles.productImageContainer, { backgroundColor: C.surface }]}>
                  <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: C.text }]} numberOfLines={2}>{product.name}</Text>
                  <ProductPriceDisplay price={product.price} salePrice={product.sale_price} />
                </View>
              </Pressable>
            ))}
          </View>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
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
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  heroBanner: {
    width: BANNER_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    height: BANNER_HEIGHT,
    ...cardShadow,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  bannerList: {
    paddingVertical: 4,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  dot: {
    borderRadius: 4,
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryChip: {
    width: 88,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...cardShadow,
  },
  categoryChipImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryChipImage: {
    width: 64,
    height: 64,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  featuredRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featuredCard: {
    width: 150,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...cardShadow,
  },
  featuredImageContainer: {
    backgroundColor: Colors.productImageBg,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  featuredName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  featuredPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 14,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...cardShadow,
  },
  productImageContainer: {
    backgroundColor: Colors.productImageBg,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    height: CARD_WIDTH,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
});
