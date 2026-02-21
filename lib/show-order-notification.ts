/**
 * Show a local notification when order is placed.
 * Requires: development build (not Expo Go), physical device, notification permission.
 */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationPriority, AndroidNotificationVisibility } from "expo-notifications";

const ORDER_CHANNEL_ID = "order_updates";

async function ensureChannel() {
  if (Platform.OS !== "android") return;
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
    // Channel may already exist
  }
}

export async function showOrderPlacedNotification(order: {
  id: number;
  number?: string;
  total?: string;
}): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false; // Simulator/emulator may not show

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return false;
    }

    await ensureChannel();

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
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
