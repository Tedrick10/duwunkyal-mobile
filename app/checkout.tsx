import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import { formatPriceMMK } from "@/lib/format";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address || "");
  const [error, setError] = useState("");

  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const total = cartItems
    ? cartItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.customPrice ?? item.product.price) * item.quantity,
      0
    )
    : 0;

  const orderMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/orders", { shippingAddress: address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/profile");
    },
  });

  function handleOrder() {
    if (!address.trim()) {
      setError("Please enter your shipping address");
      return;
    }
    setError("");
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
        {cartItems?.map((item) => (
          <View key={item.id} style={styles.summaryItem}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.summaryVariant}>
                Qty: {item.quantity}
                {item.size ? ` | ${item.size}` : ""}
                {item.color ? ` | ${item.color}` : ""}
              </Text>
            </View>
            <Text style={styles.summaryPrice}>
              {formatPriceMMK(parseFloat(item.customPrice ?? item.product.price) * item.quantity)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPriceMMK(total)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TextInput
          style={styles.addressInput}
          placeholder="Enter your full shipping address"
          placeholderTextColor={Colors.textLight}
          value={address}
          onChangeText={setAddress}
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
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLeft: { flex: 1, marginRight: 12 },
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
  addressInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
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
