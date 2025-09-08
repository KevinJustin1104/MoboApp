// services/alert.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "./api"; // kept (if used elsewhere)
import { presentLocalAlert, presentLocalGeneral } from "./notifications";

// Reuse your existing alert.api surface (kept)
import {
  AlertItem,
  fetchAlerts,
  filterByPrefs,
  getAlertPreferences,
  getReadIds,
  isWithinQuietHours,
} from "./alert.api";

export type AlertType = "flood" | "typhoon" | "brownout" | "road";
export type Severity = "info" | "warning" | "danger";

// Persisted set of already-announced alert IDs (prevents re-notifying after reload)
const ANNOUNCED_KEY = "alerts.announcedIds";

async function getAnnouncedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ANNOUNCED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveAnnouncedIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(ANNOUNCED_KEY, JSON.stringify(ids));
  } catch {}
}

/**
 * Poll alerts periodically and call onNew with newly seen alerts.
 * - Skips alerts that are already READ (from getReadIds()).
 * - Skips alerts already ANNOUNCED (persisted across reloads).
 * - Respects quiet hours and user prefs.
 */
export function startAlertsPolling(opts: {
  intervalMs?: number;
  onNew?: (newAlerts: AlertItem[]) => void;
  applyPrefs?: boolean;
  notify?: boolean;
}) {
  const { intervalMs = 30000, onNew, applyPrefs = true, notify = false } = opts || {};
  let timer: any;
  let lastSeenAt: string | undefined;
  let stopped = false;

  // Load persisted announced IDs once
  let announced = new Set<string>();
  (async () => {
    const saved = await getAnnouncedIds();
    announced = new Set(saved);
  })();

  const tick = async () => {
    if (stopped) return;

    const prefs = await getAlertPreferences();
    const list = await fetchAlerts(lastSeenAt, 50);
    const filtered = applyPrefs ? filterByPrefs(list, prefs) : list;

    if (list.length > 0) {
      const newest = list.reduce((m, x) => (x.created_at > m.created_at ? x : m), list[0]);
      lastSeenAt = newest.created_at;
    }

    // Read IDs (from storage and/or server via your alert.api helpers)
    const readIds = await getReadIds();
    const readSet = new Set(readIds);

    // Determine which alerts to announce: not read and not previously announced
    const toAnnounce = filtered.filter((a) => !readSet.has(a.id) && !announced.has(a.id));

    if (notify && !isWithinQuietHours(prefs) && toAnnounce.length > 0) {
      for (const a of toAnnounce) {
        try {
          if (a.severity === "danger" || a.severity === "warning") {
            await presentLocalAlert({ title: a.title, body: a.body, data: { id: a.id, type: a.type } });
          } else {
            await presentLocalGeneral({ title: a.title, body: a.body, data: { id: a.id, type: a.type } });
          }
        } catch {
          // swallow one-off notif errors
        } finally {
          // mark as announced so it won't fire again next polls
          announced.add(a.id);
        }
      }
      // trim & persist (avoid unbounded growth)
      const trimmed = Array.from(announced).slice(-500);
      announced = new Set(trimmed);
      saveAnnouncedIds(trimmed);
    }

    onNew?.(filtered);
  };

  // Visibility-aware loop to avoid background throttling pain on web
  const loop = async () => {
    await tick();
    if (stopped) return;
    const hidden = typeof document !== "undefined" && (document as any).hidden;
    const next = hidden ? Math.max(intervalMs, 60000) : intervalMs; // slow down when hidden
    timer = setTimeout(loop, next);
  };
  loop(); // start immediately

  const vis = () => { if (typeof document !== "undefined" && !(document as any).hidden) tick(); };
  const focus = () => tick();
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", vis);
  if (typeof window !== "undefined") window.addEventListener("focus", focus);

  return () => {
    stopped = true;
    clearTimeout(timer);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", vis);
    if (typeof window !== "undefined") window.removeEventListener("focus", focus);
  };
}

// Keep your helper, unchanged API
export async function getUnreadAlertsCount(): Promise<number> {
  const [list, read] = await Promise.all([fetchAlerts(undefined, 20), getReadIds()]);
  const readSet = new Set(read);
  return list.filter((a: any) => !readSet.has(a.id)).length;
}
