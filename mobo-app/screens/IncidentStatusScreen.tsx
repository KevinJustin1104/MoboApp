// src/screens/IncidentStatusScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../navigation";
import { getIncident } from "../services/incidents";
import client from "../services/api";
import { Image } from "react-native";

type IncidentStatusRoute = RouteProp<RootStackParamList, "IncidentStatus">;

const formatDT = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

// Define the status order used to render progress steps.
// Adjust to match your backend status values if they differ.
const STATUS_ORDER = ["Submitted", "Acknowledged", "In Progress", "Resolved"];

// Fix: compare status case-insensitively
function statusToIndex(status?: string) {
  if (!status) return 0;
  const idx = STATUS_ORDER.findIndex((s) => s.toLowerCase() === status.toLowerCase());
  return idx >= 0 ? idx : 0;
}

export default function IncidentStatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<IncidentStatusRoute>();
  const { incidentId, notificationId }: any = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchByNotification = async (nid: string) => {
      try {
        const res = await client.get("/notifications");
        const found = res.data?.find((x: any) => x.id === nid);
        return found?.incident_id ?? null;
      } catch (e) {
        console.warn("Failed to fetch notification list:", e);
        return null;
      }
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let idToFetch = incidentId ?? null;
        if (!idToFetch && notificationId) {
          idToFetch = await fetchByNotification(notificationId);
        }

        if (!idToFetch) {
          setError("No incident id provided.");
          setIncident(null);
          return;
        }

        const inc = await getIncident(idToFetch);
        if (!isMounted) return;
        setIncident(inc);
      } catch (err: any) {
        console.warn("Failed to load incident", err);
        setError(err?.response?.data?.detail || "Failed to fetch incident");
        setIncident(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [incidentId, notificationId]);

  // derive timeline steps
  const steps = useMemo(() => {
    if (!incident) return [];
    const currentIndex = statusToIndex(incident.status);
    return STATUS_ORDER.map((label, idx) => ({
      label,
      done: idx <= currentIndex, // highlight all previous steps
      at: idx === 0 ? incident.created_at : undefined,
    }));
  }, [incident]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Status</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !incident ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No status available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
          {incident.photos && incident.photos.length > 0 && (
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  <ScrollView
                    horizontal
                    contentContainerStyle={{ justifyContent: "center", alignItems: "center" }}
                    showsHorizontalScrollIndicator={false}
                  >
                    {incident.photos.map((photo: any, idx: any) => (
                      <Image
                        key={idx}
                        source={{ uri: photo }}
                        style={{ width: 200, height: 200, borderRadius: 12, marginHorizontal: 5 }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
            <Text style={styles.incId}>{incident.id}</Text>
            <Text style={styles.incTitle}>{incident.title}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>{incident.type ?? "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>{incident.address ?? "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>Reported: {formatDT(incident.created_at)}</Text>
            </View>
            <View style={[styles.metaRow, { marginTop: 8 }]}>
              <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>Status: {incident.status}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Progress</Text>
            {steps.map((s, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={[styles.bullet, s.done ? styles.bulletDone : styles.bulletTodo]}>
                  {s.done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepLabel, s.done ? styles.stepDone : undefined]}>{s.label}</Text>
                  <Text style={styles.stepTime}>{formatDT(s.at)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 12, marginBottom: 4 },
  backBtn: { width: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#0f172a" },

  content: { padding: 12, paddingBottom: 28 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
  incId: { color: "#6b7280", fontSize: 12, marginBottom: 4 },
  incTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 as any },
  metaText: { color: "#374151" },

  sectionTitle: { fontWeight: "700", color: "#0f172a", marginBottom: 10 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 as any, paddingVertical: 8 },
  bullet: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 2 },
  bulletDone: { backgroundColor: "#10b981" },
  bulletTodo: { backgroundColor: "#e5e7eb" },
  stepLabel: { fontWeight: "600", color: "#0f172a" },
  stepDone: { color: "#065f46" },
  stepTime: { color: "#9ca3af", fontSize: 12, marginTop: 2 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6b7280", marginTop: 8 },
});
