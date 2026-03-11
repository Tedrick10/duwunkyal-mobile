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
import { useTheme } from "@/lib/theme-context";
import { getProductImageSource } from "@/lib/query-client";
import { formatPriceMMK } from "@/lib/format";
import { CustomizationColorsDisplay } from "@/components/customize/CustomizationColorsDisplay";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors: C } = useTheme();

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
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderTitle, { color: C.text }]}>{order.number ?? `Order #${order.id}`}</Text>
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
        <Text style={[styles.orderDate, { color: C.textSecondary }]}>
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
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>Shipping Details</Text>
            <>
              {name && (
                <View style={styles.shippingRow}>
                  <Ionicons name="person-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={[styles.addressText, { color: C.textSecondary }]}>{name}</Text>
                </View>
              )}
              {phone && (
                <View style={[styles.shippingRow, { marginTop: 8 }]}>
                  <Ionicons name="call-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={[styles.addressText, { color: C.textSecondary }]}>{phone}</Text>
                </View>
              )}
              {address && (
                <View style={[styles.shippingRow, { marginTop: 8 }]}>
                  <Ionicons name="location-outline" size={18} color={iconColor} style={styles.shippingIcon} />
                  <Text style={[styles.addressText, { color: C.textSecondary }]}>{address}</Text>
                </View>
              )}
            </>
          </View>
        );
      })()}

      {order.notes && order.notes.trim() && (
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Order notes</Text>
          <Text style={[styles.notesText, { color: C.textSecondary }]}>{order.notes}</Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.cardTitle, { color: C.text }]}>Items</Text>
        {order.items?.map((item: any) => {
          const isCustom = !!item.customization;
          const imgFront = item.customization?.frontDesignImageUrl ?? item.product?.image ?? item.product?.image_url;
          const imgBack = item.customization?.backDesignImageUrl ?? item.product?.imageBack ?? item.product?.image_back;
          return (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
              <View style={styles.itemRow}>
                {isCustom && imgFront && imgBack && imgBack !== imgFront ? (
                  <View style={styles.itemImages}>
                    <Image source={getProductImageSource(imgFront)} style={[styles.itemImage, { backgroundColor: C.productImageBg }]} />
                    <Image source={getProductImageSource(imgBack)} style={[styles.itemImage, styles.itemImageSecond, { backgroundColor: C.productImageBg }]} />
                  </View>
                ) : (imgFront || item.product?.image) ? (
                  <Image source={getProductImageSource(imgFront || item.product?.image)} style={[styles.itemImage, { backgroundColor: C.productImageBg }]} />
                ) : null}
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: C.text }]} numberOfLines={2}>
                    {item.product?.name || "Product"}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={[styles.itemMeta, { color: C.textSecondary }]}>
                      Qty {item.quantity}
                      {item.size ? ` · Size: ${item.size}` : ""}
                    </Text>
                    {isCustom && (
                      <View style={[styles.customBadge, { backgroundColor: `${Colors.accent}15` }]}>
                        <Text style={styles.customBadgeText}>Custom</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              {isCustom && (
                <View style={[styles.colorsSection, { borderTopColor: C.border }]}>
                  <Text style={[styles.colorsSectionLabel, { color: C.textSecondary }]}>Clothes colors</Text>
                  <CustomizationColorsDisplay customization={item.customization} compact noMargin />
                </View>
              )}
              <View style={[styles.itemPriceRow, { borderTopColor: C.border }]}>
                <Text style={[styles.itemPriceLabel, { color: C.textSecondary }]}>
                  {item.quantity} × {formatPriceMMK(parseFloat(item.price))}
                </Text>
                <Text style={[styles.itemPrice, { color: C.text }]}>
                  {formatPriceMMK(parseFloat(item.price) * item.quantity)}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={[styles.divider, { backgroundColor: C.border }]} />
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: C.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: Colors.accent }]}>{formatPriceMMK(order.total)}</Text>
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
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemImages: {
    flexDirection: "row",
    gap: 8,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    resizeMode: "contain",
  },
  itemImageSecond: {
    marginLeft: 0,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  itemMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  colorsSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  colorsSectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  itemPriceLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
    marginVertical: 16,
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
