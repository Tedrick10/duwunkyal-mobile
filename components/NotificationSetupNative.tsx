import React from "react";
import { useAuth } from "@/lib/auth-context";
import { usePushNotifications, useNotificationResponseHandler } from "@/lib/use-push-notifications";

/** Registers push token and handles notification tap. Only loaded in development builds (not Expo Go). */
export function NotificationSetupNative() {
  const { user } = useAuth();
  usePushNotifications(!!user);
  useNotificationResponseHandler();
  return null;
}
