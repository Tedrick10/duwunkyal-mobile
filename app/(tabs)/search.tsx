import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { cardShadow } from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { formatPriceMMK } from "@/lib/format";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 12) / 2;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const { data: productListData, isLoading } = useQuery<{ products: { id: number; name: string; category_id: number; image_url: string; price: number; sale_price: number | null }[] }>({
    queryKey: ["productList"],
  });
  const products = productListData?.products ?? [];

  const { data: categoryData } = useQuery<{ categories: { id: number; name: string }[] }>({
    queryKey: ["categoryList"],
  });
  const categories = categoryData?.categories ?? [];

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) => p.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [products, search, activeCategory]);

  function renderProduct({ item }: { item: (typeof filtered)[0] }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.9 }, { backgroundColor: C.surface, borderColor: C.borderLight }]}
        onPress={() =>
          router.push({ pathname: "/product/[id]", params: { id: item.id.toString() } })
        }
      >
        <View style={[styles.productImageContainer, { backgroundColor: C.productImageBg ?? Colors.productImageBg }]}>
          <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="contain" />
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: C.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <ProductPriceDisplay price={item.price} salePrice={item.sale_price} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: C.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Explore</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search garments..."
          placeholderTextColor={C.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textLight} />
          </Pressable>
        )}
      </View>

      {categories && categories.length > 0 && (
        <View style={styles.categoryFilter}>
          <Pressable
            style={[styles.filterChip, !activeCategory && styles.filterChipActive, !activeCategory && {}, { backgroundColor: !activeCategory ? Colors.accent : C.surface, borderColor: !activeCategory ? Colors.accent : C.border }]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.filterChipText, !activeCategory && styles.filterChipTextActive, !activeCategory && { color: Colors.white }, { color: !activeCategory ? Colors.white : C.text }]}>
              All
            </Text>
          </Pressable>
          {categories.map((cat: any) => (
            <Pressable
              key={cat.id}
              style={[styles.filterChip, activeCategory === cat.id && styles.filterChipActive, { backgroundColor: activeCategory === cat.id ? Colors.accent : C.surface, borderColor: activeCategory === cat.id ? Colors.accent : C.border }]}
              onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === cat.id && styles.filterChipTextActive,
                  { color: activeCategory === cat.id ? Colors.white : C.text }
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={C.textLight} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  categoryFilter: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  grid: { paddingHorizontal: 20, paddingBottom: 100 },
  gridRow: { gap: 14 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
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
  productInfo: { padding: 12 },
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
