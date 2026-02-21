import React, { useEffect, useState } from "react";
import Constants from "expo-constants";

/** Wrapper: Skip notifications in Expo Go (SDK 53+ removed push from Expo Go). Load native setup only in dev build. */
export function NotificationSetup() {
  const [NativeSetup, setNativeSetup] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (Constants.appOwnership === "expo") return; // Expo Go – don't load expo-notifications
    import("./NotificationSetupNative").then((m) =>
      setNativeSetup(() => m.NotificationSetupNative)
    );
  }, []);

  if (!NativeSetup) return null;
  return <NativeSetup />;
}
