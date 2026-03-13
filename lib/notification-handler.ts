/**
 * Set notification handler at app startup (before any async loads).
 * Ensures foreground notifications show as popup/banner on both iOS and Android.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
