/**
 * Foreground notification presentation handler.
 * Keep this explicit and conservative to avoid iOS/TestFlight startup aborts.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

let initialized = false;

export function initializeNotificationHandler() {
  if (initialized || Platform.OS === "web") return;
  initialized = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Do not crash app if native notifications module is unavailable
  }
}
