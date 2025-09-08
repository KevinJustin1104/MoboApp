// services/notifications.ts
export {
  listNotifications,
  markNotificationRead,
  getUnreadCount,
  type NotificationOut,
} from "./notifications.api";

import { Platform } from "react-native";

/** Web: ask permission explicitly on first user gesture */
export async function requestWebNotificationPermission(): Promise<"granted" | "denied" | "default"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  try {
    const res = await Notification.requestPermission();
    console.log("[web] Notification permission =", res);
    return res;
  } catch {
    return "denied";
  }
}

// Shared surface both platforms implement
type NotifCommon = {
  registerForPushNotificationsAsync(): Promise<
    import("./notifications.native").PushSetupResult |
    import("./notifications.web").PushSetupResult
  >;
  startNotificationListeners(opts: {
    onReceive?: (n: any) => void;
    onRespond?: (r: any) => void;
  }): () => void;
  presentLocalAlert(opts: { title: string; body?: string; data?: any }): Promise<void>;
  presentLocalGeneral(opts: { title: string; body?: string; data?: any }): Promise<void>;
  // web-only, but we expose a no-op on native
  unlockWebAudio?: () => void;
};

// Pick the runtime implementation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod: NotifCommon =
  Platform.OS === "web"
    ? require("./notifications.web")
    : require("./notifications.native");

export const registerForPushNotificationsAsync =
  () => mod.registerForPushNotificationsAsync();

export const startNotificationListeners =
  (opts: Parameters<NotifCommon["startNotificationListeners"]>[0]) =>
    mod.startNotificationListeners(opts);

export const presentLocalAlert =
  (opts: Parameters<NotifCommon["presentLocalAlert"]>[0]) =>
    mod.presentLocalAlert(opts);

export const presentLocalGeneral =
  (opts: Parameters<NotifCommon["presentLocalGeneral"]>[0]) =>
    mod.presentLocalGeneral(opts);

// Safe no-op on native; real on web
export const unlockWebAudio = () => {
  try { mod.unlockWebAudio?.(); } catch {}
};
