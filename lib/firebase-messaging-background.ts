/**
 * Background message handler - MUST be registered at module load (top level).
 * Runs when FCM message is received while app is in background/quit state.
 * Import this file early (e.g. top of _layout.tsx) so it loads before any message arrives.
 * For data-only messages, we display the notification explicitly so it shows in status bar.
 */
import { Platform } from "react-native";

const ORDER_CHANNEL_ID = "order_updates";

if (Platform.OS !== "web") {
  try {
    const messaging = require("@react-native-firebase/messaging").default;
    const Notifications = require("expo-notifications").default;
    messaging().setBackgroundMessageHandler(async (remoteMessage: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => {
      const data = remoteMessage?.data ?? {};
      const title = remoteMessage?.notification?.title ?? data.title ?? "Order Update";
      const body = remoteMessage?.notification?.body ?? data.body ?? "";
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            ...(Platform.OS === "android" && {
              channelId: ORDER_CHANNEL_ID,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 250, 250, 250],
            }),
          },
          trigger: null,
        });
      } catch {
        // Ignore if expo-notifications unavailable in headless context
      }
    });
  } catch {
    // Firebase not available (e.g. Expo Go)
  }
}
