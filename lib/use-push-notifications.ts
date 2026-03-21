import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { router } from "expo-router";
import { apiMobileUrl, resolveNotificationImageUrl } from "./api-config";
import { LocalDataService } from "./local-data-service";

const ORDER_CHANNEL_ID = "order_updates";

/** Create high-priority Android channel so notifications pop on screen (heads-up) */
async function ensureAndroidChannel() {
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

/** Request notification permission (required on iOS and Android 13+) */
async function requestPermission() {
  if (!Device.isDevice || Platform.OS === "web") return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      return newStatus === "granted";
    }
    return true;
  } catch {
    return false;
  }
}

/** Register FCM token with backend using @react-native-firebase/messaging */
async function registerTokenWithBackend(token: string, authToken: string | null) {
  if (!authToken) return;
  try {
    await fetch(apiMobileUrl("registerPushToken"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      }),
    });
  } catch {
    // Ignore
  }
}

/** Extract orderId from notification data - FCM on Android lowercases keys (orderId → orderid) */
function getOrderIdFromData(data: Record<string, unknown> | undefined): string | null {
  if (!data || typeof data !== "object") return null;
  const id = (data.orderId ?? data.orderid ?? data.order_id) as unknown;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && !Number.isNaN(id)) return String(id);
  return null;
}

/** Dedupe: both useLastNotificationResponse and addNotificationResponseReceivedListener can fire for same tap */
let lastHandledKey = "";
let lastHandledTime = 0;
const DEDUPE_MS = 2000;

/** Navigate based on notification: order when orderId present, else notification detail for custom */
function handleNotificationData(data: Record<string, unknown> | undefined) {
  if (!data || typeof data !== "object") return;
  const orderId = getOrderIdFromData(data);
  const type = (data.type ?? data.Type ?? data.type_) as string | undefined;
  const title = (data.title ?? data.Title) as string | undefined;
  const body = (data.body ?? data.Body) as string | undefined;
  const image = (data.image ?? data.imageUrl ?? data.image_url ?? data.imageurl) as string | undefined;
  const notifId = (data.notificationId ?? data.notification_id) as string | undefined;

  const key = orderId
    ? `order-${orderId}`
    : `notif-${notifId ?? title ?? body ?? Date.now()}`;
  const now = Date.now();
  if (lastHandledKey === key && now - lastHandledTime < DEDUPE_MS) return;
  lastHandledKey = key;
  lastHandledTime = now;

  setTimeout(() => {
    if (orderId) {
      router.push(`/order/${orderId}`);
    } else if (type === "custom" || title || body) {
      const resolvedImage = resolveNotificationImageUrl(image ?? "");
      router.push({
        pathname: "/notification-detail",
        params: {
          title: title ?? "Notification",
          body: body ?? "",
          image: resolvedImage,
        },
      });
    }
  }, 300);
}

export function usePushNotifications(enabled: boolean) {
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    ensureAndroidChannel();
  }, []);

  useEffect(() => {
    if (!enabled || !Device.isDevice || Platform.OS === "web") return;

    let mounted = true;

    async function setup() {
      const granted = await requestPermission();
      if (!granted) return;

      try {
        const messaging = (await import("@react-native-firebase/messaging")).default;
        // iOS: request FCM permission
        if (Platform.OS === "ios") {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          if (!enabled) return;
        }

        async function registerToken(token: string) {
          if (!token || !mounted) return;
          if (lastTokenRef.current === token) return;
          lastTokenRef.current = token;
          const authToken = await LocalDataService.getStoredToken();
          await registerTokenWithBackend(token, authToken);
        }

        const token = await messaging().getToken();
        await registerToken(token);

        // Re-register when token rotates (critical for delivery)
        messaging().onTokenRefresh(async (newToken: string) => {
          lastTokenRef.current = null;
          await registerToken(newToken);
        });
      } catch {
        lastTokenRef.current = null;
      }
    }

    setup();
    return () => {
      mounted = false;
    };
  }, [enabled]);
}

/** Must be called once at app root - handles notification tap (background + quit) and foreground display */
export function useNotificationResponseHandler() {
  // Handle tap when app was killed and opened by notification (expo-notifications)
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (lastResponse?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
      handleNotificationData(data);
    }
  }, [lastResponse]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Handle tap on expo-displayed notifications (local + FCM foreground) when app in background
    const expoSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      handleNotificationData(data);
    });

    let getMessaging: () => import("@react-native-firebase/messaging").FirebaseMessagingTypes.Module;
    try {
      getMessaging = require("@react-native-firebase/messaging").default;
    } catch {
      return () => expoSub.remove(); // Firebase not available (e.g. Expo Go)
    }

    const messaging = getMessaging();

    // App opened from quit state by tapping FCM notification (system-displayed)
    messaging
      .getInitialNotification()
      .then((remoteMessage: { data?: Record<string, unknown> } | null) => {
        if (remoteMessage?.data) {
          handleNotificationData(remoteMessage.data);
        }
      });

    // App opened from background by tapping FCM notification (system-displayed)
    const unsubscribe = messaging.onNotificationOpenedApp((remoteMessage: { data?: Record<string, unknown> }) => {
      handleNotificationData(remoteMessage?.data);
    });

    // Foreground: show notification as heads-up (Firebase doesn't auto-display in foreground)
    // Handles both notification+data (Place Order) and data-only (Order Status Update)
    const unsubForeground = messaging.onMessage(async (remoteMessage) => {
      const data = (remoteMessage?.data ?? {}) as Record<string, string>;
      const title =
        remoteMessage?.notification?.title ?? data.title ?? "Order Update";
      const body =
        remoteMessage?.notification?.body ?? data.body ?? "";
      if (!title && !body) return;
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
          ...(Platform.OS === "ios" && {
            interruptionLevel: "timeSensitive" as const,
            sound: "default" as const,
          }),
        },
        trigger: null,
      });
    });

    return () => {
      expoSub.remove();
      unsubscribe();
      unsubForeground();
    };
  }, []);
}
