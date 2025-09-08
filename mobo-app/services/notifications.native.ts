// src/services/notifications.native.ts
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
export { listNotifications, markNotificationRead, getUnreadCount } from "./notifications.api";

/* Types */
export type PushSetupResult = {
  status: Notifications.PermissionStatus;
  token?: string;
};

/* Foreground behavior (SDK 53+) */
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* Android channels */
async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "alert", // matches plugin-added sound name
    enableVibrate: true,
    vibrationPattern: [0, 300, 200, 300],
    enableLights: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("general", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "notification",
    enableVibrate: true,
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/* Ask permission + get Expo push token */
export async function registerForPushNotificationsAsync(): Promise<PushSetupResult> {
  await ensureAndroidChannels();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return { status };

  const projectId =
    (Constants as any)?.easConfig?.projectId ??
    (Constants?.expoConfig as any)?.extra?.eas?.projectId;

  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return { status, token: tokenResp.data };
  } catch (e) {
    console.warn("[push] getExpoPushTokenAsync failed", e);
    return { status, token: undefined };
  }
}

/* Local notifs (immediate) */
export async function presentLocalAlert(opts: { title: string; body?: string; data?: any }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body ?? "",
      data: opts.data ?? {},
      // iOS: use default sound; Android sound comes from the channel
      sound: Platform.OS === "ios" ? true : undefined,
    },
    trigger: null,
    ...(Platform.OS === "android" ? { android: { channelId: "alerts" } } : {}),
  });
}

export async function presentLocalGeneral(opts: { title: string; body?: string; data?: any }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body ?? "",
      data: opts.data ?? {},
      sound: Platform.OS === "ios" ? true : undefined,
    },
    trigger: null,
    ...(Platform.OS === "android" ? { android: { channelId: "general" } } : {}),
  });
}

/* Foreground listeners (receive + tap) */
export function startNotificationListeners(opts: {
  onReceive?: (n: Notifications.Notification) => void;
  onRespond?: (r: Notifications.NotificationResponse) => void;
}) {
  const s1 = Notifications.addNotificationReceivedListener((n) => opts.onReceive?.(n));
  const s2 = Notifications.addNotificationResponseReceivedListener((r) => opts.onRespond?.(r));
  return () => { s1.remove(); s2.remove(); };
}

// native doesn't need unlockWebAudio (no-op)
export function unlockWebAudio() {}
