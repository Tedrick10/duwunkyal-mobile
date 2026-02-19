import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getProductImageSource } from "@/lib/query-client";
import { formatPriceMMK } from "@/lib/format";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [shippingName, setShippingName] = useState(user?.name ?? "");
  const [shippingPhone, setShippingPhone] = useState(user?.phone ?? "");
  const [shippingAddress, setShippingAddress] = useState(user?.address ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setShippingName((prev) => prev || (user.name ?? ""));
      setShippingPhone((prev) => prev || (user.phone ?? ""));
      setShippingAddress((prev) => prev || (user.address ?? ""));
    }
  }, [user]);

  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const total = cartItems
    ? cartItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.customPrice ?? item.product?.price ?? "0") * item.quantity,
      0
    )
    : 0;

  const orderMutation = useMutation<{ id: number; number?: string; total?: string }>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders", {
        shippingAddress: shippingAddress.trim(),
        shippingName: shippingName.trim() || undefined,
        shippingPhone: shippingPhone.trim() || undefined,
      });
      if (!res.ok) throw new Error("Place order failed");
      return (await res.json()) as { id: number; number?: string; total?: string };
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/order-success",
        params: {
          id: String(order.id),
          number: order.number ?? undefined,
          total: order.total,
        },
      });
    },
    onError: (err) => {
      setError((err as Error).message);
    },
  });

  function handleOrder() {
    setError("");
    if (!shippingName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!shippingPhone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!shippingAddress.trim()) {
      setError("Please enter your shipping address");
      return;
    }
    orderMutation.mutate();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryList}>
          {cartItems?.map((item) => {
            const isCustom = item.customization != null;
            const price = parseFloat(item.customPrice ?? item.product?.price ?? "0") * item.quantity;
            const imgFront = item.product?.image ?? item.product?.image_url;
            const imgBack = item.product?.imageBack ?? item.product?.image_back;
            return (
              <View key={item.id} style={styles.summaryCard}>
                <View style={styles.summaryImages}>
                  {isCustom && imgFront && imgBack && imgBack !== imgFront ? (
                    <>
                      <Image
                        source={getProductImageSource(imgFront)}
                        style={styles.summaryImage}
                        resizeMode="contain"
                      />
                      <Image
                        source={getProductImageSource(imgBack)}
                        style={[styles.summaryImage, styles.summaryImageSecond]}
                        resizeMode="contain"
                      />
                    </>
                  ) : (
                    <Image
                      source={getProductImageSource(imgFront || item.product?.image)}
                      style={styles.summaryImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryName} numberOfLines={2}>
                    {item.product?.name ?? "Product"}
                  </Text>
                  <Text style={styles.summaryVariant}>
                    Qty: {item.quantity}
                    {item.size ? ` • ${item.size}` : ""}
                    {item.color ? ` • ${item.color}` : ""}
                  </Text>
                  {isCustom && (
                    <Text style={styles.summaryCustom}>Custom design</Text>
                  )}
                </View>
                <Text style={styles.summaryPrice}>{formatPriceMMK(price)}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPriceMMK(total)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Details</Text>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Full name *"
          placeholderTextColor={Colors.textLight}
          value={shippingName}
          onChangeText={setShippingName}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Phone number *"
          placeholderTextColor={Colors.textLight}
          value={shippingPhone}
          onChangeText={setShippingPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, styles.addressInput, { marginTop: 10 }]}
          placeholder="Full shipping address *"
          placeholderTextColor={Colors.textLight}
          value={shippingAddress}
          onChangeText={setShippingAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.placeOrderBtn,
            pressed && { opacity: 0.9 },
            orderMutation.isPending && { opacity: 0.6 },
          ]}
          onPress={handleOrder}
          disabled={orderMutation.isPending}
        >
          {orderMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.placeOrderText}>Place Order</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { padding: 20, marginBottom: 4 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 16,
  },
  summaryList: {},
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  summaryImages: {
    flexDirection: "row",
    gap: 6,
  },
  summaryImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: Colors.productImageBg,
  },
  summaryImageSecond: {
    marginLeft: 0,
  },
  summaryContent: {
    flex: 1,
    marginLeft: 12,
  },
  summaryName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  summaryVariant: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryCustom: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
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
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.error}10`,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  addressInput: {
    minHeight: 80,
  },
  placeOrderBtn: {
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  placeOrderText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
