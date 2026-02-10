import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 12) / 2;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: category } = useQuery<any>({
    queryKey: ["/api/categories"],
    select: (cats: any[]) => cats?.find((c) => c.id === parseInt(id as string)),
  });

  const { data: products, isLoading } = useQuery<any[]>({
    queryKey: ["/api/products/category", id],
  });

  function renderProduct({ item }: { item: any }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.9 }]}
        onPress={() =>
          router.push({ pathname: "/product/[id]", params: { id: item.id.toString() } })
        }
      >
        <View style={styles.productImageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>${parseFloat(item.price).toFixed(2)}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{category?.name || "Category"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : !products || products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shirt-outline" size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>No products in this category</Text>
        </View>
      ) : (
        <FlatList
          data={products}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  grid: { paddingHorizontal: 20, paddingBottom: 40 },
  gridRow: { gap: 12 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  productImageContainer: {
    backgroundColor: Colors.surfaceSecondary,
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
  productInfo: { padding: 10 },
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
