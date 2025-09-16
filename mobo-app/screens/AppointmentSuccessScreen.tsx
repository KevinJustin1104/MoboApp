// src/screens/AppointmentSuccessScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg"; // yarn add react-native-qrcode-svg
import { Ionicons } from "@expo/vector-icons";
import { Appointment } from "../services/appointments";

type Params = { appt: Appointment };

export default function AppointmentSuccessScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { appt } = route.params as Params;

  const payload = `appt:${appt.id}|token:${appt.qr_token}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.popToTop()} style={styles.backBtn}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Booked</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Show this QR at the window</Text>

        <View style={styles.qrWrapper}>
          <QRCode value={payload} size={180} />
        </View>

        <Text style={styles.meta}>
          {new Date(appt.slot_start).toLocaleString()} • {appt.status.toUpperCase()}
        </Text>
        <Text style={styles.metaSmall}>
          Service #{appt.service_id} • Dept #{appt.department_id}
        </Text>

        {/* Display Appointment ID */}
        <View style={styles.kv}>
          <Text style={styles.kvLabel}>Appointment ID</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} numberOfLines={1} selectable>
              {appt.id}
            </Text>
          </View>
        </View>

        {/* Display QR Token */}
        <View style={styles.kv}>
          <Text style={styles.kvLabel}>QR Token</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} numberOfLines={1} selectable>
              {appt.qr_token}
            </Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => nav.navigate("MyAppointments" as never)}
      >
        <Text style={styles.ctaText}>View My Appointments</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb", padding: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#0f172a" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, elevation: 1, marginTop: 8 },
  title: { fontWeight: "800", color: "#0f172a", fontSize: 16 },
  qrWrapper: { alignSelf: "center", marginVertical: 12, backgroundColor: "#fff", padding: 8, borderRadius: 12 },

  meta: { color: "#334155", marginTop: 8 },
  metaSmall: { color: "#94a3b8", marginTop: 2 },

  kv: { marginTop: 12 },
  kvLabel: { color: "#475569", fontWeight: "700", marginBottom: 6 },
  codeBox: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  codeText: { color: "#0f172a", fontFamily: "monospace", fontSize: 12 },

  cta: { backgroundColor: "#1e40af", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 14 },
  ctaText: { color: "#fff", fontWeight: "800" },
});
