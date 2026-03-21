import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePushNotifications, useNotificationResponseHandler } from "@/lib/use-push-notifications";
import { initializeNotificationHandler } from "@/lib/notification-handler";

/** Registers push token and handles notification tap. Only loaded in development builds (not Expo Go). */
export function NotificationSetupNative() {
  const { user } = useAuth();
  useEffect(() => {
    initializeNotificationHandler();
  }, []);
  usePushNotifications(!!user);
  useNotificationResponseHandler();
  return null;
}
