// src/screens/AlertDetailScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Image,
  Alert as RNAlert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import BackHeader from "../components/BackHeader";
import type { RootStackParamList } from "../navigation";
import { getAlert, markAlertRead } from "../services/alert.api";

type AlertDetailRoute = RouteProp<RootStackParamList, "AlertDetail">;

// You can refine this to your exact API shape
type AnyAlert = {
  id: string;
  title: string;
  body?: string;
  created_at?: string;
  updated_at?: string;
  severity?: "info" | "warning" | "emergency" | "outage";
  category?: string; // "flood" | "storm" | "outage" | "road" | etc.
  area_name?: string;
  barangay?: string;
  source?: string;
  image_url?: string;
  tags?: string[];
};

const formatDT = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export default function AlertDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<AlertDetailRoute>();
  const { id, alert: initialAlert } = route.params || ({} as any);

  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<AnyAlert | null>(initialAlert ?? null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const severity = (alert?.severity ?? "info").toLowerCase() as AnyAlert["severity"];

  const sevStyle = useMemo(() => {
    switch (severity) {
      case "emergency":
        return { bg: "#fee2e2", text: "#b91c1c" };
      case "warning":
        return { bg: "#fff7ed", text: "#9a3412" };
      case "outage":
        return { bg: "#eff6ff", text: "#1d4ed8" };
      default:
        return { bg: "#f1f5f9", text: "#334155" };
    }
  }, [severity]);

  const load = useCallback(async () => {
    if (initialAlert) {
      setAlert(initialAlert as AnyAlert);
      setLoading(false);
      return;
    }
    if (!id) {
      setError("No alert id provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAlert(id);
      // Map severity to allowed values
      const severityMap: Record<string, AnyAlert["severity"]> = {
        danger: "emergency",
        emergency: "emergency",
        warning: "warning",
        info: "info",
        outage: "outage",
      };
      setAlert({
        ...data,
        severity: severityMap[data.severity?.toLowerCase() || "info"] ?? "info",
      });
    } catch (e: any) {
      console.warn("getAlert failed:", e);
      setError(e?.response?.data?.detail || e?.message || "Failed to load alert.");
    } finally {
      setLoading(false);
    }
  }, [id, initialAlert]);

  useEffect(() => {
    load();
  }, [load]);

  const onShare = useCallback(async () => {
    if (!alert) return;
    const msg = `${alert.title}\n\n${alert.body ?? ""}\n\n${t("alerts.sharedVia", "Shared via Mobo Citizen")}`;
    try {
      await Share.share({ message: msg.trim() });
    } catch (e) {
      // swallow
    }
  }, [alert, t]);

  const onMarkRead = useCallback(async () => {
    if (!alert?.id) return;
    setMarking(true);
    try {
      await markAlertRead(alert.id);
      RNAlert.alert(t("alerts.markedReadTitle", "Done"), t("alerts.markedReadBody", "This alert was marked as read."));
    } catch (e: any) {
      RNAlert.alert(t("common.error", "Error"), e?.response?.data?.detail || "Failed to mark as read.");
    } finally {
      setMarking(false);
    }
  }, [alert?.id, t]);

  const headerTitle = alert?.category
    ? `${t("alerts.alert", "Alert")}: ${alert.category}`
    : t("alerts.alert", "Alert");

  return (
    <View style={styles.screen}>
      <BackHeader title={headerTitle} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0369a1" />
        </View>
      ) : error ? (
        <View style={[styles.center, { paddingHorizontal: 16 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={{ marginTop: 10, color: "#64748b", textAlign: "center" }}>{error}</Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 12 }]} onPress={load}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnText}>{t("common.retry", "Retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : !alert ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={{ marginTop: 10, color: "#64748b" }}>{t("alerts.notFound", "Alert not found")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Title & severity */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={[styles.severityPill, { backgroundColor: sevStyle.bg }]}>
                <Ionicons
                  name={
                    severity === "emergency"
                      ? "alert"
                      : severity === "warning"
                      ? "warning-outline"
                      : severity === "outage"
                      ? "flash-outline"
                      : "information-circle-outline"
                  }
                  size={14}
                  color={sevStyle.text}
                />
                <Text style={[styles.severityText, { color: sevStyle.text }]}>
                  {(severity ?? "info").charAt(0).toUpperCase() + (severity ?? "info").slice(1)}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={onShare} style={styles.iconBtn} accessibilityLabel={t("common.share", "Share")}>
                  <Ionicons name="share-social-outline" size={18} color="#0f172a" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onMarkRead}
                  style={[styles.iconBtn, marking && { opacity: 0.6 }]}
                  disabled={marking}
                  accessibilityLabel={t("alerts.markRead", "Mark as read")}
                >
                  <Ionicons name="checkmark-done-outline" size={18} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.title}>{alert.title}</Text>

            <View style={[styles.metaRow, { marginTop: 8 }]}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>{formatDT(alert.updated_at || alert.created_at)}</Text>
            </View>

            {!!(alert.area_name || alert.barangay) && (
              <View style={[styles.metaRow, { marginTop: 6 }]}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>
                  {alert.area_name ?? alert.barangay}
                </Text>
              </View>
            )}

            {!!alert.source && (
              <View style={[styles.metaRow, { marginTop: 6 }]}>
                <Ionicons name="link-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>{alert.source}</Text>
              </View>
            )}
          </View>

          {/* Image (optional) */}
          {!!alert.image_url && (
            <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
              <Image source={{ uri: alert.image_url }} style={styles.image} resizeMode="cover" />
            </View>
          )}

          {/* Body */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("common.details", "Details")}</Text>
            <Text style={styles.bodyText}>{alert.body || t("alerts.noDetails", "No additional details.")}</Text>

            {/* Tags */}
            {alert.tags && alert.tags.length > 0 && (
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap" }}>
                {alert.tags.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7fbff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0369a1",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  content: { padding: 16, paddingBottom: 28 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
    }),
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6 as any,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  severityText: { fontWeight: "800", fontSize: 12 },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 as any },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { marginTop: 10, fontSize: 16, fontWeight: "800", color: "#0f172a" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 as any },
  metaText: { color: "#374151" },

  sectionTitle: { fontWeight: "700", color: "#0f172a", marginBottom: 8, fontSize: 13 },
  bodyText: { color: "#334155", lineHeight: 20 },

  image: { width: "100%", height: 220 },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: "#475569", fontWeight: "700", fontSize: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14, marginLeft: 6 },
});
