/**
 * Show a local notification when order is placed.
 * Requires: development build (not Expo Go), physical device, notification permission.
 * In Expo Go (SDK 53+), expo-notifications push is removed – we safely no-op.
 */
import { Platform } from "react-native";
import * as Device from "expo-device";

const ORDER_CHANNEL_ID = "order_updates";

export async function showOrderPlacedNotification(order: {
  id: number;
  number?: string;
  total?: string;
}): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  try {
    const Notifications = await import("expo-notifications");
    const {
      AndroidImportance,
      AndroidNotificationPriority,
      AndroidNotificationVisibility,
    } = await import("expo-notifications");

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return false;
    }

    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
          name: "Order Updates",
          importance: AndroidImportance.MAX,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      } catch {
        /* channel may already exist */
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Order placed successfully",
        body: order.number
          ? `Order ${order.number} has been placed. Total: ${order.total ?? ""} Ks`
          : "Your order has been placed.",
        data: { orderId: String(order.id) },
        ...(Platform.OS === "android" && {
          channelId: ORDER_CHANNEL_ID,
          priority: AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        }),
        ...(Platform.OS === "ios" && {
          interruptionLevel: "timeSensitive" as const,
          sound: "default" as const,
        }),
      },
      trigger: null,
    });
    return true;
  } catch {
    /* Expo Go does not support expo-notifications (SDK 53+); dev build required */
    return false;
  }
}
