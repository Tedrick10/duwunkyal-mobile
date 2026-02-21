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
import { getProductImageSource } from "@/lib/query-client";
import { formatPriceMMK } from "@/lib/format";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ["/api/orders", id],
    refetchOnMount: "always",
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
          <Text style={styles.orderTitle}>{order.number ?? `Order #${order.id}`}</Text>
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

      {(order.shippingAddress || order.shippingName || order.shippingPhone) && (() => {
        let name = order.shippingName;
        let phone = order.shippingPhone;
        let address = order.shippingAddress;
        const combined = address && (!name || !phone) && /^.+,.+,.+$/.test(address.trim());
        if (combined) {
          const parts = address!.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (parts.length >= 3 && /^\+?[\d\s-]+$/.test(parts[1].replace(/\s/g, ""))) {
            name = parts[0];
            phone = parts[1];
            address = parts.slice(2).join(", ");
          }
        } else if (address && name && address.includes(name) && phone && address.includes(phone)) {
          const parts = address.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (parts.length >= 3 && /^\+?[\d\s-]+$/.test(parts[1].replace(/\s/g, ""))) {
            name = parts[0];
            phone = parts[1];
            address = parts.slice(2).join(", ");
          }
        }
        const iconColor = "#60a5fa";
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shipping Details</Text>
            <>
              {name && (
                <View style={styles.shippingRow}>
                  <Ionicons name="person-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={styles.addressText}>{name}</Text>
                </View>
              )}
              {phone && (
                <View style={[styles.shippingRow, { marginTop: 8 }]}>
                  <Ionicons name="call-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={styles.addressText}>{phone}</Text>
                </View>
              )}
              {address && (
                <View style={[styles.shippingRow, { marginTop: 8 }]}>
                  <Ionicons name="location-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={styles.addressText}>{address}</Text>
                </View>
              )}
            </>
          </View>
        );
      })()}

      {order.notes && order.notes.trim() && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order notes</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items?.map((item: any) => {
          const isCustom = !!item.customization;
          const imgFront = item.product?.image ?? item.product?.image_url;
          const imgBack = item.product?.imageBack ?? item.product?.image_back;
          return (
            <View key={item.id} style={styles.item}>
              {isCustom && imgFront && imgBack && imgBack !== imgFront ? (
                <View style={styles.itemImages}>
                  <Image source={getProductImageSource(imgFront)} style={styles.itemImage} />
                  <Image source={getProductImageSource(imgBack)} style={[styles.itemImage, styles.itemImageSecond]} />
                </View>
              ) : (imgFront || item.product?.image) ? (
                <Image source={getProductImageSource(imgFront || item.product?.image)} style={styles.itemImage} />
              ) : null}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name || "Product"}</Text>
                <Text style={styles.itemVariant}>
                  Qty: {item.quantity}
                  {item.size ? ` • ${item.size}` : ""}
                  {item.color ? ` • ${item.color}` : ""}
                  {item.customization && " • Custom design"}
                </Text>
                {item.customization?.bodyColor && (
                  <View style={styles.colorRow}>
                    <View style={[styles.colorSwatch, { backgroundColor: item.customization.bodyColor }]} />
                    <Text style={styles.colorText}>Color: {item.customization.bodyColor}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemPrice}>
                {formatPriceMMK(parseFloat(item.price) * item.quantity)}
              </Text>
            </View>
          );
        })}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPriceMMK(order.total)}</Text>
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
  shippingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shippingIcon: {
    marginRight: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  notesText: {
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
  itemImages: {
    flexDirection: "row",
    gap: 6,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.white,
    resizeMode: "contain",
  },
  itemImageSecond: {
    marginLeft: 0,
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
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
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
