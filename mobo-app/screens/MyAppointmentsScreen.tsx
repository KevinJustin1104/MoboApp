// src/screens/MyAppointmentsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { myAppointments, cancelAppointment, type Appointment } from "../services/appointments";
import QueueNowBanner from "../components/QueueNowBanner";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

function StatusPill({ status }: { status: Appointment["status"] }) {
  const stylesPill = StyleSheet.create({
    pill: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
      backgroundColor:
        status === "booked" ? "#eaf0ff" :
        status === "serving" ? "#d1fae5" :
        status === "done" ? "#dcfce7" :
        status === "cancelled" ? "#fee2e2" :
        status === "no_show" ? "#fee2e2" : "#f1f5f9",
    },
    txt: {
      color:
        status === "booked" ? "#1e40af" :
        status === "serving" ? "#065f46" :
        status === "done" ? "#166534" :
        status === "cancelled" ? "#b91c1c" :
        status === "no_show" ? "#b91c1c" : "#334155",
      fontWeight: "800", fontSize: 12,
    },
  });
  return (
    <View style={stylesPill.pill}>
      <Text style={stylesPill.txt}>{status.replace("_", " ").toUpperCase()}</Text>
    </View>
  );
}

export default function MyAppointmentsScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await myAppointments();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // soft auto-refresh (every 30s)
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const upcoming = useMemo(
    () => items.filter(i => new Date(i.slot_start) >= new Date()).sort((a,b)=>+new Date(a.slot_start)-+new Date(b.slot_start)),
    [items]
  );
  const past = useMemo(
    () => items.filter(i => new Date(i.slot_start) < new Date()).sort((a,b)=>+new Date(b.slot_start)-+new Date(a.slot_start)),
    [items]
  );

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{`Service #${item.service_id}`}</Text>
        <Text style={styles.when}>
          {new Date(item.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        </Text>
        <View style={{ marginTop: 6 }}>
          <StatusPill status={item.status} />
        </View>
        {item.queue_number ? (
          <Text style={styles.queue}>Your Queue: {item.queue_number}</Text>
        ) : null}
      </View>

      <View style={{ alignItems: "flex-end", gap: 8 as any }}>
        {/* Show QR (booked/checked_in/serving) */}
        {["booked", "checked_in", "serving"].includes(item.status) ? (
          <TouchableOpacity
            onPress={() => nav.navigate("AppointmentSuccess" as never, { appt: item } as never)}
            style={styles.ghostBtn}
          >
            <Ionicons name="qr-code-outline" size={16} color="#1e40af" />
            <Text style={styles.ghostText}>Show QR</Text>
          </TouchableOpacity>
        ) : null}
        {/* Cancel (only booked) */}
        {item.status === "booked" ? (
          <TouchableOpacity
            onPress={() => cancelAppointment(item.id).then(load)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={[{ section: "Upcoming" }, ...upcoming, { section: "Past" }, ...past] as any[]}
          keyExtractor={(i, idx) => ("section" in i ? `sec-${i.section}` : (i as Appointment).id) ?? String(idx)}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          renderItem={({ item }) =>
            "section" in item ? (
              <Text style={styles.sectionTitle}>{item.section}</Text>
            ) : (
              renderItem({ item })
            )
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#94a3b8" }}>
              You have no appointments yet.
            </Text>
          }
        />
      )}

      {/* Optional: show queue banner for the first upcoming appointment’s department */}
      {upcoming[0] ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 10 }}>
          <QueueNowBanner departmentId={upcoming[0].department_id} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: Platform.OS === "ios" ? 12 : 8, marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#0f172a" },

  sectionTitle: { fontWeight: "800", color: "#0f172a", marginTop: 10, marginBottom: 6 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontWeight: "800", color: "#0f172a" },
  when: { color: "#475569", marginTop: 2 },
  queue: { color: "#1e40af", marginTop: 6, fontWeight: "700" },

  ghostBtn: {
    backgroundColor: "#eaf0ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6 as any,
  },
  ghostText: { color: "#1e40af", fontWeight: "800" },

  cancelBtn: { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  cancelText: { color: "#dc2626", fontWeight: "800" },
});
