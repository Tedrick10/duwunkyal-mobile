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
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getImageUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 12) / 2;
const BANNER_WIDTH = width - 40;
const BANNER_HEIGHT = 210;
const AUTO_SCROLL_INTERVAL = 4000;

function BannerDot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const dotStyle = useAnimatedStyle(() => {
    const isActive = activeIndex === index;
    return {
      width: withTiming(isActive ? 20 : 6, { duration: 250 }),
      opacity: withTiming(isActive ? 1 : 0.35, { duration: 250 }),
      backgroundColor: isActive ? Colors.accent : Colors.white,
    };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bannerRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracting = useRef(false);

  const { data: featured, isLoading: loadingFeatured, refetch: refetchFeatured } = useQuery<any[]>({
    queryKey: ["/api/products/featured"],
  });

  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products, isLoading: loadingProducts, refetch: refetchProducts } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const isLoading = loadingFeatured || loadingCategories || loadingProducts;
  const bannerItems = featured && featured.length > 0 ? featured : [];

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      if (userInteracting.current || !bannerRef.current || bannerItems.length <= 1) return;
      setActiveSlide((prev) => {
        const next = (prev + 1) % bannerItems.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
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
      const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
      setActiveSlide(idx);
      startAutoScroll();
    },
    [startAutoScroll]
  );

  function onRefresh() {
    refetchFeatured();
    refetchCategories();
    refetchProducts();
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const renderBannerItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.heroBanner}
      onPress={() =>
        router.push({ pathname: "/product/[id]", params: { id: item.id.toString() } })
      }
    >
      <Image source={{ uri: getImageUrl(item.image) }} style={styles.heroImage} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.65)"]}
        style={styles.heroGradient}
      >
        <Text style={styles.heroLabel}>Featured</Text>
        <Text style={styles.heroTitle}>{item.name}</Text>
        <Text style={styles.heroPrice}>${parseFloat(item.price).toFixed(2)}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + webTopInset }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {user ? `Hi, ${user.name.split(" ")[0]}` : "Welcome"}
          </Text>
          <Text style={styles.headerTitle}>StyleVault</Text>
        </View>
        <Pressable
          style={styles.notifBtn}
          onPress={() => {
            if (!user) router.push("/(auth)/login");
          }}
        >
          <Ionicons
            name={user ? "notifications-outline" : "person-outline"}
            size={22}
            color={Colors.text}
          />
        </Pressable>
      </View>

      {bannerItems.length > 0 && (
        <View style={styles.section}>
          <FlatList
            ref={bannerRef}
            data={bannerItems}
            renderItem={renderBannerItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            onScrollBeginDrag={onBannerScrollBegin}
            onMomentumScrollEnd={onBannerScrollEnd}
            onScrollEndDrag={onBannerScrollEnd}
            getItemLayout={(_, index) => ({
              length: BANNER_WIDTH,
              offset: BANNER_WIDTH * index,
              index,
            })}
          />
          {bannerItems.length > 1 && (
            <View style={styles.dotsRow}>
              {bannerItems.map((_: any, i: number) => (
                <BannerDot key={i} index={i} activeIndex={activeSlide} />
              ))}
            </View>
          )}
        </View>
      )}

      {categories && categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {categories.map((cat: any) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.categoryChip, pressed && { opacity: 0.8 }]}
                onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id.toString() } })}
              >
                {cat.image && <Image source={{ uri: getImageUrl(cat.image) }} style={styles.categoryChipImage} />}
                <Text style={styles.categoryChipText}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {featured && featured.length > 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hot Right Now</Text>
            <Ionicons name="flame" size={18} color={Colors.accent} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featured.slice(1).map((product: any) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={styles.featuredImageContainer}>
                  <Image source={{ uri: getImageUrl(product.image) }} style={styles.featuredImage} />
                </View>
                <Text style={styles.featuredName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.featuredPrice}>${parseFloat(product.price).toFixed(2)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {products && products.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Products</Text>
          </View>
          <View style={styles.productsGrid}>
            {products.map((product: any) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id.toString() } })}
              >
                <View style={styles.productImageContainer}>
                  <Image source={{ uri: getImageUrl(product.image) }} style={styles.productImage} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.productPrice}>${parseFloat(product.price).toFixed(2)}</Text>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: { marginBottom: 24 },
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
    borderRadius: 16,
    overflow: "hidden",
    height: BANNER_HEIGHT,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginBottom: 4,
  },
  heroPrice: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  featuredRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featuredCard: {
    width: 150,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featuredImageContainer: {
    backgroundColor: Colors.white,
    padding: 12,
    alignItems: "center",
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
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  featuredPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productImageContainer: {
    backgroundColor: Colors.white,
    padding: 10,
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
    padding: 10,
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
