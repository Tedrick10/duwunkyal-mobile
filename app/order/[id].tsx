import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ["/api/orders", id],
  });

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>Order #{order.id}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(order.status)}20` },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </View>
        <Text style={styles.orderDate}>
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      {order.shippingAddress && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipping Address</Text>
          <Text style={styles.addressText}>{order.shippingAddress}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items?.map((item: any) => (
          <View key={item.id} style={styles.item}>
            {item.product?.image && (
              <Image source={{ uri: item.product.image }} style={styles.itemImage} />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product?.name || "Product"}</Text>
              <Text style={styles.itemVariant}>
                Qty: {item.quantity}
                {item.size ? ` | ${item.size}` : ""}
                {item.color ? ` | ${item.color}` : ""}
              </Text>
            </View>
            <Text style={styles.itemPrice}>
              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${parseFloat(order.total).toFixed(2)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize" as const,
  },
  orderDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    resizeMode: "contain",
  },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  itemVariant: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
});
