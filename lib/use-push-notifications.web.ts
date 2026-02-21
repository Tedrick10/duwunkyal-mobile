import { useEffect } from "react";

/** No-op on web - push notifications not supported */
export function usePushNotifications(_enabled: boolean) {
  useEffect(() => { }, []);
}

/** No-op on web */
export function useNotificationResponseHandler() {
  useEffect(() => { }, []);
}
