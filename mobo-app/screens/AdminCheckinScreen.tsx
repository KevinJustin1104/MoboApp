// src/screens/admin/AdminCheckinScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BarCodeScanner } from "expo-barcode-scanner";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation";
import { checkinAppointment, type Appointment } from "../services/appointments";
import type { QueueTicket } from "../services/queue";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdminCheckin">;

/** Accepts:
 *  - "appt:<id>|token:<qrToken>"
 *  - JSON: {"id":"<id>","qr_token":"<qrToken>"} (optional)
 *  - raw: id + token typed separately in the form
 */
function parseQrPayload(raw: string): { id?: string; qr_token?: string } {
  const out: { id?: string; qr_token?: string } = {};

  // JSON?
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      if (obj.appt || obj.id) out.id = obj.appt || obj.id;
      if (obj.qr_token || obj.token) out.qr_token = obj.qr_token || obj.token;
      if (out.id && out.qr_token) return out;
    }
  } catch (_) {
    // not JSON, continue
  }

  // "key:value|key:value"
  const parts = raw.split("|");
  for (const p of parts) {
    const [k, v] = p.split(":");
    if (!k || !v) continue;
    const key = k.trim().toLowerCase();
    const val = v.trim();
    if (key === "appt" || key === "id") out.id = val;
    if (key === "token" || key === "qr_token") out.qr_token = val;
  }
  return out;
}

export default function AdminCheckinScreen() {
  const nav = useNavigation<Nav>();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<"scan" | "manual">("scan");

  const [inputRaw, setInputRaw] = useState("");       // paste full QR string if you want
  const [apptId, setApptId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [busy, setBusy] = useState(false);

  const [result, setResult] = useState<QueueTicket | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const doCheckin = useCallback(async (id: string, token: string) => {
    setBusy(true);
    setResult(null);
    try {
      const ticket = await checkinAppointment(id, token); // POST /appointments/{id}/checkin
      setResult(ticket);
      Alert.alert("Checked-in", `Queue #${ticket.number} (${ticket.status})`);
    } catch (e: any) {
      Alert.alert("Check-in failed", e?.message || "Invalid QR or appointment not found.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const parsed = parseQrPayload(data);
    if (parsed.id && parsed.qr_token) {
      doCheckin(parsed.id, parsed.qr_token);
    } else {
      Alert.alert("Unrecognized QR", "Please make sure it contains appt:<id>|token:<token>.");
      setTimeout(() => setScanned(false), 800); // allow scanning again
    }
  };

  const onUsePasted = async () => {
    const parsed = parseQrPayload(inputRaw.trim());
    if (!parsed.id || !parsed.qr_token) {
      return Alert.alert("Invalid input", "Paste a full QR string like appt:<id>|token:<token>.");
    }
    doCheckin(parsed.id, parsed.qr_token);
  };

  const onManual = async () => {
    if (!apptId.trim() || !qrToken.trim()) {
      return Alert.alert("Validation", "Appointment ID and QR token are required.");
    }
    doCheckin(apptId.trim(), qrToken.trim());
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f6f8fb" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in (QR / Manual)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Mode tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setMode("scan")}
          style={[styles.tabBtn, mode === "scan" && styles.tabActive]}
        >
          <Ionicons name="qr-code-outline" size={16} color={mode === "scan" ? "#fff" : "#0f172a"} />
          <Text style={[styles.tabText, mode === "scan" && styles.tabTextActive]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("manual")}
          style={[styles.tabBtn, mode === "manual" && styles.tabActive]}
        >
          <Ionicons name="create-outline" size={16} color={mode === "manual" ? "#fff" : "#0f172a"} />
          <Text style={[styles.tabText, mode === "manual" && styles.tabTextActive]}>Manual</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {mode === "scan" ? (
          <>
            {hasPermission === null ? (
              <View style={styles.centerBox}><ActivityIndicator /></View>
            ) : hasPermission === false ? (
              <View style={styles.centerBox}>
                <Text style={{ color: "#ef4444", textAlign: "center" }}>
                  Camera permission denied. Switch to Manual tab or enable camera in settings.
                </Text>
              </View>
            ) : (
              <View style={styles.scannerBox}>
                <BarCodeScanner
                  onBarCodeScanned={onBarCodeScanned}
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                />
                {scanned ? (
                  <TouchableOpacity style={styles.scanAgainBtn} onPress={() => setScanned(false)} disabled={busy}>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={styles.scanAgainText}>Scan again</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {/* Optional paste field */}
            <Text style={styles.sectionLabel}>Or paste QR string</Text>
            <TextInput
              style={styles.input}
              placeholder="appt:<id>|token:<qrToken>"
              value={inputRaw}
              onChangeText={setInputRaw}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={onUsePasted} disabled={busy}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryText}>{busy ? "Checking in..." : "Check in"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Appointment ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 7b1a2a3e-... (UUID)"
              value={apptId}
              onChangeText={setApptId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.sectionLabel}>QR Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste token from user QR"
              value={qrToken}
              onChangeText={setQrToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={onManual} disabled={busy}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryText}>{busy ? "Checking in..." : "Check in"}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Result card */}
        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Assigned Ticket</Text>
            <Text style={styles.ticketNum}>#{result.number}</Text>
            <Text style={styles.resultMeta}>Status: <Text style={{ fontWeight: "800" }}>{result.status}</Text></Text>
            <Text style={styles.resultMeta}>Department: {result.department_id}</Text>
            {result.service_id != null ? (
              <Text style={styles.resultMeta}>Service: {result.service_id}</Text>
            ) : null}
          </View>
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

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0",
  },
  tabActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  tabText: { fontWeight: "800", color: "#0f172a" },
  tabTextActive: { color: "#fff" },

  centerBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginHorizontal: 16, marginTop: 8, alignItems: "center" },
  scannerBox: {
    height: 280, marginHorizontal: 16, borderRadius: 12, overflow: "hidden",
    backgroundColor: "#111827",
  },
  scanAgainBtn: {
    position: "absolute", bottom: 10, right: 10,
    backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  scanAgainText: { color: "#fff", fontWeight: "800" },

  sectionLabel: { marginTop: 12, marginHorizontal: 16, color: "#475569", fontWeight: "700" },
  input: {
    marginHorizontal: 16, marginTop: 6,
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#fff",
  },

  primaryBtn: {
    marginTop: 12, alignSelf: "flex-start", marginLeft: 16,
    backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "800" },

  resultCard: { backgroundColor: "#fff", marginTop: 16, marginHorizontal: 16, borderRadius: 12, padding: 14 },
  resultTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  ticketNum: { fontSize: 28, fontWeight: "900", color: "#0f172a", marginTop: 4 },
  resultMeta: { color: "#475569", marginTop: 4 },
});
