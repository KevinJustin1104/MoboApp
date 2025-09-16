// src/screens/admin/AdminWindowDetailScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation";
import {
  adminOpenWindow,
  adminCloseWindow,
  adminCallNext,
  adminTicketDone,
  adminTicketNoShow,
  type QueueTicket,
} from "../services/queue";

import { userCurrentForWindow, userQueueNow, type QueueNow } from "../services/queue";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdminWindowDetail">;
type Rt = RouteProp<RootStackParamList, "AdminWindowDetail">;

export default function AdminWindowDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const w = params.window;

  const [isOpen, setIsOpen] = useState<boolean>(w.is_open);
  const [busy, setBusy] = useState(false);

  const [current, setCurrent] = useState<QueueTicket | null>(null);
  const [stats, setStats] = useState<QueueNow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cur, qn] = await Promise.all([
        userCurrentForWindow(w.id),
        userQueueNow(w.department_id),
      ]);
      setCurrent(cur ?? null);
      setStats(qn ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (isOpen) {
        await adminCloseWindow(w.id);
        setIsOpen(false);
      } else {
        await adminOpenWindow(w.id);
        setIsOpen(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to change window status.");
    } finally {
      setBusy(false);
    }
  };

  const callNext = async () => {
    setBusy(true);
    try {
      console.log(w)
      const t = await adminCallNext(w.id);
      console.log(t)
      setCurrent(t);
      await load();
    } catch (e: any) {
      Alert.alert("Info", e?.message || "No waiting tickets.");
    } finally {
      setBusy(false);
    }
  };

  const markDone = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await adminTicketDone(current.id);
      setCurrent(null);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to mark done.");
    } finally {
      setBusy(false);
    }
  };

  const markNoShow = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await adminTicketNoShow(current.id);
      setCurrent(null);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to mark no-show.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f6f8fb" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{w.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Window state card */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.dot, { backgroundColor: isOpen ? "#22c55e" : "#ef4444" }]} />
              <Text style={styles.title}>{isOpen ? "Open" : "Closed"}</Text>
            </View>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: isOpen ? "#fee2e2" : "#dcfce7" }]} onPress={toggle} disabled={busy}>
              <Ionicons name={isOpen ? "close-circle-outline" : "play-circle-outline"} size={18} color={isOpen ? "#ef4444" : "#16a34a"} />
              <Text style={[styles.toggleText, { color: isOpen ? "#ef4444" : "#16a34a" }]}>
                {isOpen ? "Close window" : "Open window"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.meta}>Department #{w.department_id}</Text>
        </View>

        {/* Queue stats */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>Queue status</Text>
          {loading && !stats ? (
            <ActivityIndicator />
          ) : stats ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.rowText}>Now serving: <Text style={styles.bold}>{stats.now_serving ?? "—"}</Text></Text>
              <Text style={styles.rowText}>Waiting: <Text style={styles.bold}>{stats.waiting}</Text></Text>
              {stats.average_wait_min != null ? (
                <Text style={styles.rowText}>Avg wait: <Text style={styles.bold}>{stats.average_wait_min} min</Text></Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ color: "#64748b" }}>Unable to load queue status</Text>
          )}
        </View>

        {/* Current ticket & actions */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>Current ticket</Text>
          {loading && current === null ? (
            <ActivityIndicator />
          ) : current ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.bigNumber}>#{current.number}</Text>
              <Text style={styles.rowText}>Status: <Text style={styles.bold}>{current.status}</Text></Text>
              {current.service_id != null ? (
                <Text style={styles.rowText}>Service: <Text style={styles.bold}>{current.service_id}</Text></Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]} onPress={markDone} disabled={busy}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                  <Text style={[styles.actText, { color: "#166534" }]}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: "#fee2e2", borderColor: "#fecaca" }]} onPress={markNoShow} disabled={busy}>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actText, { color: "#991b1b" }]}>No-show</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: "#64748b", marginBottom: 10 }}>No one is being served.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={callNext} disabled={busy || !isOpen}>
                <Ionicons name="play-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryText}>Call next</Text>
              </TouchableOpacity>
              {!isOpen ? (
                <Text style={{ color: "#ef4444", marginTop: 8 }}>Open the window to call next ticket.</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Call next (also show button when a current exists to re-call next) */}
        {current ? (
          <TouchableOpacity style={[styles.primaryBtn, { alignSelf: "center", marginTop: 6 }]} onPress={callNext} disabled={busy || !isOpen}>
            <Ionicons name="play-forward-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryText}>Call next</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#64748b", marginTop: 4 },

  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },

  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  toggleText: { fontWeight: "800" },

  rowText: { color: "#475569", marginTop: 4 },
  bold: { fontWeight: "800", color: "#0f172a" },
  bigNumber: { fontSize: 28, fontWeight: "900", color: "#0f172a", marginBottom: 6 },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: "#fff", fontWeight: "800" },

  actBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actText: { fontWeight: "800" },
});
