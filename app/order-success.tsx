import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { formatPriceMMK } from "@/lib/format";

export default function OrderSuccessScreen() {
  const { id, number, total } = useLocalSearchParams<{
    id: string;
    number?: string;
    total?: string;
  }>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={["#2ecc71", "#27ae60"]}
            style={styles.iconCircle}
          >
            <Ionicons name="checkmark-circle" size={80} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Order Successful!</Text>
        <Text style={styles.subtitle}>
          Thank you for your order. We'll start preparing it right away.
        </Text>
        {(number || id) && (
          <Text style={styles.orderNumber}>
            {number ?? `Order #${id}`}
          </Text>
        )}
        {total && (
          <Text style={styles.total}>{formatPriceMMK(total)}</Text>
        )}
      </View>

      <View style={styles.actions}>
        {id && (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { marginBottom: 12 }, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace({ pathname: "/order/[id]", params: { id } });
            }}
          >
            <Text style={styles.primaryBtnText}>View Order</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  iconWrap: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  orderNumber: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 20,
  },
  total: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    marginTop: 8,
  },
  actions: {
    width: "100%",
    paddingBottom: 40,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  secondaryBtnText: {
    color: Colors.accent,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
