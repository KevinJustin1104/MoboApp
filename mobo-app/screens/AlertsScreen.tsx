// src/screens/AlertsScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BackHeader from "../components/BackHeader";
import {
  AlertItem,
  getAlertPreferences,

  filterByPrefs,
  getReadIds,
  markAlertRead,
} from "../services/alert.api";
import{ startAlertsPolling } from "../services/alert";
import { useNavigation } from "@react-navigation/native";

export default function AlertsScreen() {
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unsubRef = useRef<null | (() => void)>(null);

  const loadRead = async () => {
    const ids = await getReadIds();
    setReadIds(new Set(ids));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const prefs = await getAlertPreferences();
        // initial empty, polling will fill
        if (!mounted) return;
        // start polling
        unsubRef.current = startAlertsPolling({
          intervalMs: 30000,
          onNew: async (batch:any) => {
            setAlerts((prev) => {
              // merge de-duplicated by id
              const map = new Map<string, AlertItem>();
              [...batch, ...prev].forEach((a) => map.set(a.id, a));
              // sorted newest first
              return Array.from(map.values()).sort(
                (a, b) => (b.created_at > a.created_at ? 1 : -1)
              );
            });
            await loadRead();
            setLoading(false);
          },
          applyPrefs: true,
        });
      } catch (e) {
        console.warn("[AlertsScreen] init failed", e);
        setLoading(false);
      }
    })();
    return () => {
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = null;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force one immediate tick by toggling polling off/on:
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = startAlertsPolling({
          onNew: async (batch:any) => {
            const prefs = await getAlertPreferences();
            const filtered = filterByPrefs(batch, prefs);
            setAlerts((prev) => {
              const map = new Map<string, AlertItem>();
              [...filtered, ...prev].forEach((a) => map.set(a.id, a));
              return Array.from(map.values()).sort(
                (a, b) => (b.created_at > a.created_at ? 1 : -1)
              );
            });
            await loadRead();
          },
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = useMemo(
    () => alerts.filter((a) => !readIds.has(a.id)).length,
    [alerts, readIds]
  );

  const markOneRead = async (id: string) => {
    await markAlertRead(id);
    setReadIds((s) => new Set([...s, id]));
  };

  const renderItem = ({ item }: { item: AlertItem }) => {
    const unread = !readIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, unread && styles.rowUnread]}
        activeOpacity={0.9}
        onPress={async () => {
          await markOneRead(item.id);
          nav.navigate("AlertDetail", { id: item.id, alert: item });
        }}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBubble, bubbleByType(item.type, item.severity)]}>
            <Ionicons name={iconByType(item.type)} size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.body ? (
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
            <Text style={styles.rowMeta}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </View>

        {unread ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Real-time Alerts"/>

      <View style={styles.headerCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.headerTitle}>Town-wide & barangay alerts</Text>
          <TouchableOpacity onPress={() => nav.navigate("AlertSettings")} style={styles.gearBtn}>
            <Ionicons name="options-outline" size={16} color="#0369a1" />
            <Text style={styles.gearText}>Preferences</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          Flood, typhoon, brownout schedules, road closures — filtered by your barangay and quiet hours.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0369a1" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={44} color="#9ca3af" />
          <Text style={styles.emptyText}>No alerts right now</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 0, marginBottom: 8 }}>
              <Text style={styles.counterText}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function iconByType(t: AlertItem["type"]) {
  switch (t) {
    case "flood":
      return "water-outline";
    case "typhoon":
      return "cloudy-outline";
    case "brownout":
      return "flash-outline";
    case "road":
      return "car-outline";
    default:
      return "notifications-outline";
  }
}

function bubbleByType(
  t: AlertItem["type"],
  s: AlertItem["severity"] = "info"
): any {
  const base = { backgroundColor: "#94a3b8" };
  if (t === "flood" && s !== "info") return { backgroundColor: "#0ea5e9" };
  if (t === "typhoon") return { backgroundColor: "#64748b" };
  if (t === "brownout") return { backgroundColor: "#f59e0b" };
  if (t === "road") return { backgroundColor: "#10b981" };
  if (s === "danger") return { backgroundColor: "#ef4444" };
  if (s === "warning") return { backgroundColor: "#f59e0b" };
  return base;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff" },

  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 } }),
  },
  headerTitle: { fontWeight: "800", color: "#0f172a" },
  headerSub: { marginTop: 6, color: "#64748b" },
  gearBtn: { flexDirection: "row", alignItems: "center", gap: 6 as any, backgroundColor: "#e6f4ff", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  gearText: { color: "#0369a1", fontWeight: "700", fontSize: 12 },

  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  rowUnread: { borderWidth: 1, borderColor: "#cfe9ff" },
  rowLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10 as any, flex: 1 },
  iconBubble: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontWeight: "800", color: "#0f172a" },
  rowSub: { color: "#475569", marginTop: 4 },
  rowMeta: { color: "#9ca3af", marginTop: 6, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", marginLeft: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 8, color: "#94a3b8" },
  counterText: { color: "#64748b", fontWeight: "700", marginBottom: 8 },
});
