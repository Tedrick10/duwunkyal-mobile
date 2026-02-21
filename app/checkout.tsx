import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { showOrderPlacedNotification } from "@/lib/show-order-notification";
import Colors, { cardShadow } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getProductImageSource } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { formatPriceMMK } from "@/lib/format";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [shippingName, setShippingName] = useState(user?.name ?? "");
  const [shippingPhone, setShippingPhone] = useState(user?.phone ?? "");
  const [shippingAddress, setShippingAddress] = useState(user?.address ?? "");
  const [notes, setNotes] = useState("");
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
        notes: notes.trim() || undefined,
      });
      if (!res.ok) throw new Error("Place order failed");
      return (await res.json()) as { id: number; number?: string; total?: string };
    },
    onSuccess: async (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await showOrderPlacedNotification(order);
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

  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={true}
      keyboardDismissMode="on-drag"
      bottomOffset={20}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCardWrap}>
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
        <View style={styles.formCard}>
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Full name *"
              placeholderTextColor={Colors.textLight}
              value={shippingName}
              onChangeText={setShippingName}
            />
          </View>
          <View style={[styles.inputGroup, styles.inputSpacing]}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Phone number *"
              placeholderTextColor={Colors.textLight}
              value={shippingPhone}
              onChangeText={setShippingPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.inputSpacing]}>
            <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.addressInput, styles.inputWithIcon]}
              placeholder="Full shipping address *"
              placeholderTextColor={Colors.textLight}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <View style={[styles.inputGroup, styles.inputSpacing]}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.notesInput, styles.inputWithIcon]}
              placeholder="Order notes (optional)"
              placeholderTextColor={Colors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.placeOrderSection]}>
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
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  summaryCardWrap: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary ?? "#f0f1f3",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...cardShadow,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  inputIcon: {
    marginTop: 16,
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  inputSpacing: {
    marginTop: 12,
  },
  addressInput: {
    minHeight: 80,
    paddingTop: 14,
  },
  notesInput: {
    minHeight: 64,
    paddingTop: 14,
  },
  placeOrderSection: { marginBottom: 0, paddingBottom: 8 },
  placeOrderBtn: {
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  placeOrderText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
