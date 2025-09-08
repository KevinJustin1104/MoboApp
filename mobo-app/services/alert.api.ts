// src/services/alert.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "./api";
// Use the platform bridge (native/web)


export type AlertType = "flood" | "typhoon" | "brownout" | "road";
export type Severity = "info" | "warning" | "danger";

export type AlertItem = {
  id: string;
  title: string;
  body?: string;
  type: AlertType;
  severity?: Severity;
  barangays?: string[];
  created_at: string;
  starts_at?: string;
  ends_at?: string;
};

export type AlertPreferences = {
  enabledTypes: AlertType[];
  myBarangay?: string | null;
  onlyMyBarangay: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
};

const PREF_KEY = "alerts.prefs";
const READ_KEY = "alerts.readIds";

export type CreateAlertPayload = {
  title: string;
  body?: string;
  category?: AlertType;
  severity?: Severity;
  barangay?: string;
  purok?: string;
  source?: string;
  valid_until?: string;
};

export async function createAlert(payload: CreateAlertPayload) {
  const { data } = await client.post("/alerts", payload);
  return data; // backend AlertOut
}

export const defaultPrefs: AlertPreferences = {
  enabledTypes: ["flood", "typhoon", "brownout", "road"],
  myBarangay: null,
  onlyMyBarangay: false,
  quietHours: { enabled: false, start: "22:00", end: "06:00" },
};

// ---- helpers to normalize API → app model ----
function mapSeverity(s?: string): Severity {
  if (!s) return "info";
  const v = String(s).toLowerCase();
  if (v === "critical") return "danger";
  if (v === "warning") return "warning";
  return "info";
}
function mapType(t?: string): AlertType {
  const v = (t || "").toLowerCase();
  if (v === "flood" || v === "baha") return "flood";
  if (v === "typhoon" || v === "bagyo") return "typhoon";
  if (v === "brownout" || v === "power") return "brownout";
  if (v === "road" || v === "closure") return "road";
  return "road";
}
function apiToAlert(a: any): AlertItem {
  return {
    id: a.id,
    title: a.title,
    body: a.body ?? a.description ?? "",
    type: mapType(a.type ?? a.category),
    severity: mapSeverity(a.severity),
    barangays: Array.isArray(a.barangays) ? a.barangays : a.barangay ? [a.barangay] : [],
    created_at: a.created_at ?? a.issued_at ?? new Date().toISOString(),
    starts_at: a.starts_at ?? a.valid_from,
    ends_at: a.ends_at ?? a.valid_until,
  };
}

// ---- preferences ----
export async function getAlertPreferences(): Promise<AlertPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw);
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}
export async function updateAlertPreferences(p: Partial<AlertPreferences>) {
  const current = await getAlertPreferences();
  const next = { ...current, ...p };
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(next));
  return next;
}

// ---- fetchers ----
export async function fetchAlerts(since?: string, limit = 50): Promise<AlertItem[]> {
  const params: any = { limit };
  if (since) params.since = since;
  // Cache buster to prevent stale GET on web
  params._ts = Date.now();

  try {
    const res = await client.get("/alerts", {
      params,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    const raw: any[] = res.data?.items ?? res.data ?? [];
    return raw.map(apiToAlert);
  } catch (e) {
    console.warn("[alerts] fetchAlerts failed; returning []", e);
    return [];
  }
}

export async function getAlert(id: string): Promise<AlertItem> {
  const res = await client.get(`/alerts/${encodeURIComponent(id)}`);
  return apiToAlert(res.data);
}

// ---- read state ----
export async function markAlertRead(id: string) {
  try {
    await client.post(`/alerts/${encodeURIComponent(id)}/read`);
  } catch {
    // ignore if backend not ready
  }
  const ids = new Set<string>(await getReadIds());
  ids.add(id);
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}
export async function getReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---- filtering & quiet hours ----
export function isWithinQuietHours(prefs: AlertPreferences, now = new Date()) {
  if (!prefs.quietHours.enabled) return false;
  const [sh, sm] = (prefs.quietHours.start || "00:00").split(":").map(Number);
  const [eh, em] = (prefs.quietHours.end || "00:00").split(":").map(Number);

  const start = new Date(now);
  start.setHours(sh || 0, sm || 0, 0, 0);
  const end = new Date(now);
  end.setHours(eh || 0, em || 0, 0, 0);

  if (end <= start) {
    // wraps past midnight
    return now >= start || now <= end;
  }
  return now >= start && now <= end;
}

export function filterByPrefs(items: AlertItem[], prefs: AlertPreferences): AlertItem[] {
  const tset = new Set(prefs.enabledTypes);
  return items.filter((a) => {
    if (!tset.has(a.type)) return false;
    if (prefs.onlyMyBarangay && prefs.myBarangay) {
      if (a.barangays && a.barangays.length > 0) {
        return a.barangays.map((b) => b.toLowerCase()).includes(prefs.myBarangay.toLowerCase());
      }
      // Town-wide alerts (no barangay restriction) still show.
      return true;
    }
    return true;
  });
}

/**
 * Poll alerts periodically and call onNew with newly seen alerts.
 * Keeps your original API calls; adds cache-busting and visibility-aware scheduling.
 */
