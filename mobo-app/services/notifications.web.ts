// src/services/notifications.web.ts
export { listNotifications, markNotificationRead, getUnreadCount } from "./notifications.api";
export type PushSetupResult = { status: "granted" | "denied" | "default"; token?: string };
import { Asset } from "expo-asset";

let audioEl: HTMLAudioElement | null = null;
let audioUnlocked = false;

// ADD near the top
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


export async function unlockWebAudio() {
  if (audioUnlocked) return;
  try {
    // require still works here; expo-asset will resolve to a URL on web
    const asset = Asset.fromModule(require("../assets/notification.mp3"));
    await asset.downloadAsync();
    audioEl = new Audio(asset.uri); // resolved URL on web
    await audioEl.play().then(() => {
      audioEl?.pause();
      if (audioEl) audioEl.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  } catch {}
}

function webBeep() {
  if (!audioUnlocked || !audioEl) return;
  try {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  } catch {}
}

// ... keep the rest identical (ensurePermission, presentLocalAlert/General, etc.)


function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}
async function ensurePermission(): Promise<"granted" | "denied" | "default"> {
  if (!canNotify()) return "denied";
  if (Notification.permission === "default") return await Notification.requestPermission();
  return Notification.permission;
}

export async function presentLocalAlert(opts: { title: string; body?: string; data?: any }) {
  const perm = await ensurePermission();
  if (perm === "granted") {
    new Notification(opts.title, { body: opts.body ?? "" });
    if (navigator.vibrate) navigator.vibrate([120, 180, 120, 240]);
    webBeep();
  } else {
    console.warn("Alert:", opts.title, opts.body ?? "");
  }
}

export async function presentLocalGeneral(opts: { title: string; body?: string; data?: any }) {
  const perm = await ensurePermission();
  if (perm === "granted") {
    new Notification(opts.title, { body: opts.body ?? "" });
    if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
    webBeep();
  } else {
    console.log("Notification:", opts.title, opts.body ?? "");
  }
}

export async function registerForPushNotificationsAsync(): Promise<PushSetupResult> {
  const perm = await ensurePermission();
  return { status: perm, token: undefined };
}

export function startNotificationListeners(_: { onReceive?: (n: any) => void; onRespond?: (r: any) => void }) {
  return () => {};
}
