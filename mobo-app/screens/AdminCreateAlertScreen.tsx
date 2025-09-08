// src/screens/AdminCreateAlertScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createAlert, Severity, AlertType } from "../services/alert.api";
import { listBarangays, type Barangay } from "../services/barangays";

export default function AdminCreateAlertScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AlertType>("flood");
  const [severity, setSeverity] = useState<Severity>("info");
  const [barangay, setBarangay] = useState<string | null>(null);
  const [purok, setPurok] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>(""); // ISO-like string (YYYY-MM-DD HH:mm), optional

  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingBrgy, setLoadingBrgy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const categories: { key: AlertType; label: string }[] = [
    { key: "flood", label: "Flooding" },
    { key: "typhoon", label: "Typhoon" },
    { key: "brownout", label: "Brownout" },
    { key: "road", label: "Road closures" },
  ];

  const severities: { key: Severity; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "warning", label: "Warning" },
    { key: "danger", label: "Critical" },
  ];

  const loadBarangays = useCallback(async (q?: string) => {
    setLoadingBrgy(true);
    try {
      const list = await listBarangays(q, 300);
      setBarangays(list);
    } catch (e) {
      console.warn("listBarangays failed:", e);
      setBarangays([]);
    } finally {
      setLoadingBrgy(false);
    }
  }, []);

  useEffect(() => {
    loadBarangays();
  }, [loadBarangays]);

  const filteredBarangays = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barangays;
    return barangays.filter(b => b.name.toLowerCase().includes(q) || (b.code ?? "").toLowerCase().includes(q));
  }, [barangays, search]);

  const onSave = async () => {
    if (!title.trim()) return Alert.alert("Missing title", "Please enter a title.");
    setSaving(true);
    try {
      await createAlert({
        title: title.trim(),
        body: body.trim() || undefined,
        category,
        severity,
        barangay: barangay || undefined,   // omit means “all barangays”
        purok: purok.trim() || undefined,
        source: source.trim() || undefined,
        valid_until: validUntil.trim() || undefined, // backend accepts ISO datetime; empty => no expiry
      });
      Alert.alert("Alert sent", "Your alert has been created.");
      navigation.goBack();
    } catch (err: any) {
      console.warn("createAlert failed:", err);
      Alert.alert("Failed", err?.response?.data?.detail || err?.message || "Could not create alert.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Simple back header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Alert</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        {/* title */}
        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Flood advisory for Barangay Poblacion"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* body */}
        <View style={styles.card}>
          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            multiline
            placeholder="Details, instructions, safety tips, schedule, etc."
            value={body}
            onChangeText={setBody}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* category & severity */}
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {categories.map(c => {
              const on = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Severity</Text>
          <View style={styles.chipsRow}>
            {severities.map(s => {
              const on = severity === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setSeverity(s.key)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* targeting */}
        <View style={styles.card}>
          <Text style={styles.label}>Targeting</Text>
          <Text style={styles.help}>Leave barangay empty to send to all.</Text>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search barangay"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadBarangays(search)}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(""); loadBarangays(); }}>
                <Ionicons name="close-circle" size={16} color="#94a3af" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingBrgy ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, !barangay && styles.chipOn]}
                onPress={() => setBarangay(null)}
              >
                <Text style={[styles.chipText, !barangay && styles.chipTextOn]}>All barangays</Text>
              </TouchableOpacity>

              {filteredBarangays.map(b => {
                const on = barangay?.toLowerCase() === b.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setBarangay(b.name)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Purok (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Purok 3"
            value={purok}
            onChangeText={setPurok}
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Source (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., MDRRMO, Electric Coop"
            value={source}
            onChangeText={setSource}
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Valid until (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD HH:mm"
            value={validUntil}
            onChangeText={setValidUntil}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={onSave}
          activeOpacity={0.9}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          <Text style={styles.saveText}>{saving ? "Sending…" : "Send alert"}</Text>
        </TouchableOpacity>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff" },
  header: {
    paddingTop: Platform.OS === "ios" ? 48 : 20, paddingBottom: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#eef2ff",
  },
  headerTitle: { fontWeight: "800", color: "#0f172a", fontSize: 16 },

  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8 }, android: { elevation: 1 } }),
  },
  label: { fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  help: { color: "#64748b", marginBottom: 8 },

  input: {
    backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6",
    paddingHorizontal: 10, paddingVertical: 10, color: "#0f172a",
  },

  chipsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 as any },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5f9" },
  chipOn: { backgroundColor: "#e8f3ff", borderColor: "#cfe9ff", borderWidth: 1 },
  chipText: { color: "#0f172a", fontWeight: "700" },
  chipTextOn: { color: "#0369a1", fontWeight: "800" },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8 as any,
    backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6",
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", padding: 0 },

  saveBtn: {
    backgroundColor: "#0369a1", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8 as any,
  },
  saveText: { color: "#fff", fontWeight: "800", marginLeft: 8 },
});
