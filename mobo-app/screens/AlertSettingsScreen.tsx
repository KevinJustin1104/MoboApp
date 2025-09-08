// src/screens/AlertSettingsScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BackHeader from "../components/BackHeader";
import {
  AlertPreferences,
  AlertType,
  defaultPrefs,
  getAlertPreferences,
  updateAlertPreferences,
} from "../services/alert.api";
import { listBarangays, type Barangay } from "../services/barangays";
import { getMe } from "../services/users"; // <-- NEW

export default function AlertSettingsScreen() {
  const [prefs, setPrefs] = useState<AlertPreferences>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [brgyLoading, setBrgyLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPrefs = useCallback(async () => {
    const p = await getAlertPreferences();
    setPrefs(p);
  }, []);

  const loadBarangays = useCallback(async (q?: string) => {
    setBrgyLoading(true);
    try {
      const list = await listBarangays(q, 300);
      setBarangays(list);
    } catch (e) {
      console.warn("Failed to load barangays", e);
      setBarangays([]);
    } finally {
      setBrgyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
    loadBarangays();
  }, [loadPrefs, loadBarangays]);

  // --- NEW: default "myBarangay" from the currently logged-in user ---
  useEffect(() => {
    (async () => {
      // only set default if empty
      if (prefs.myBarangay) return;

      try {
        const me = await getMe();
        // try multiple shapes your backend might return
        let nameFromUser: string | undefined =
          me?.barangay?.name ||
          me?.barangay_name;

        // if only barangay_id is present, map to name from loaded list
        if (!nameFromUser && me?.barangay_id && barangays.length) {
          const found = barangays.find((b) => Number(b.id) === Number(me.barangay_id));
          nameFromUser = found?.name;
        }

        if (nameFromUser) {
          setPrefs((p: any) => ({ ...p, myBarangay: nameFromUser }));
        }
      } catch (err) {
        console.warn("Failed to fetch current user barangay:", err);
      }
    })();
  }, [prefs.myBarangay, barangays]); // re-run when barangays load so id->name mapping works

  const toggleType = (t: AlertType) => {
    setPrefs((p: any) => {
      const has = p.enabledTypes.includes(t);
      const enabledTypes = has ? p.enabledTypes.filter((x: any) => x !== t) : [...p.enabledTypes, t];
      return { ...p, enabledTypes };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateAlertPreferences(prefs);
    } finally {
      setSaving(false);
    }
  };

  const filteredBarangays = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barangays;
    return barangays.filter((b) => b.name.toLowerCase().includes(q) || (b.code ?? "").toLowerCase().includes(q));
  }, [barangays, search]);

  return (
    <View style={styles.container}>
      <BackHeader title="Alert Preferences" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* barangay */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Barangay targeting</Text>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => setPrefs((p: any) => ({ ...p, onlyMyBarangay: !p.onlyMyBarangay }))}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={prefs.onlyMyBarangay ? "checkmark-circle" : "ellipse-outline"} size={18} color={prefs.onlyMyBarangay ? "#0369a1" : "#64748b"} />
              <Text style={styles.rowLabel}>Only show alerts for my barangay</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>My barangay</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{prefs.myBarangay || "Not set"}</Text>
            </View>
          </View>

          {/* search */}
          <View style={[styles.searchRow, { marginTop: 10 }]}>
            <Ionicons name="search" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search barangay…"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadBarangays(search)}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(""); loadBarangays(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94a3af" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* chips */}
          {brgyLoading ? (
            <View style={[styles.chipsContainer, { alignItems: "center" }]}>
              <ActivityIndicator />
            </View>
          ) : filteredBarangays.length === 0 ? (
            <View style={[styles.chipsContainer, { alignItems: "center" }]}>
              <Text style={{ color: "#64748b" }}>No barangays found</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {filteredBarangays.map((b) => {
                const active = (prefs.myBarangay || "").toLowerCase() === b.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.brgyChip, active && styles.brgyChipOn]}
                    onPress={() => setPrefs((p: any) => ({ ...p, myBarangay: b.name }))}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.brgyChipText, active && { color: "#0369a1", fontWeight: "800" }]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* types */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alert types</Text>
          {[
            { key: "flood", label: "Flooding" },
            { key: "typhoon", label: "Typhoon" },
            { key: "brownout", label: "Brownout schedule" },
            { key: "road", label: "Road closures" },
          ].map((t: any) => {
            const on = (prefs.enabledTypes as any[]).includes(t.key);
            return (
              <TouchableOpacity key={t.key} style={styles.row} onPress={() => toggleType(t.key as AlertType)}>
                <View style={styles.rowLeft}>
                  <Ionicons name={on ? "checkbox" : "square-outline"} size={18} color={on ? "#0369a1" : "#64748b"} />
                  <Text style={styles.rowLabel}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* quiet hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quiet hours</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => setPrefs((p: any) => ({ ...p, quietHours: { ...p.quietHours, enabled: !p.quietHours.enabled } }))}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={prefs.quietHours.enabled ? "checkmark-circle" : "ellipse-outline"} size={18} color={prefs.quietHours.enabled ? "#0369a1" : "#64748b"} />
              <Text style={styles.rowLabel}>Mute notifications during hours</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Start (HH:MM)</Text>
            <TextInput
              value={prefs.quietHours.start}
              onChangeText={(v) => setPrefs((p: any) => ({ ...p, quietHours: { ...p.quietHours, start: v } }))}
              style={styles.input}
              placeholder="22:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>End (HH:MM)</Text>
            <TextInput
              value={prefs.quietHours.end}
              onChangeText={(v) => setPrefs((p: any) => ({ ...p, quietHours: { ...p.quietHours, end: v } }))}
              style={styles.input}
              placeholder="06:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save Preferences"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff" },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8 }, android: { elevation: 1 } }),
  },
  cardTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 8 },

  row: { paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 as any },
  rowLabel: { color: "#0f172a", fontWeight: "700" },

  pill: { backgroundColor: "#f1f5f9", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: "#334155", fontWeight: "700" },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8 as any,
    backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6",
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", padding: 0 },

  chipsContainer: { marginTop: 10, paddingVertical: 4, gap: 8 as any },
  brgyChip: { backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", marginRight: 8 },
  brgyChipOn: { backgroundColor: "#e8f3ff", borderColor: "#cfe9ff" },
  brgyChipText: { color: "#0f172a", fontWeight: "700" },

  input: { backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 90, textAlign: "center", color: "#0f172a" },

  saveBtn: { marginTop: 6, backgroundColor: "#0369a1", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 as any },
  saveText: { color: "#fff", fontWeight: "800", marginLeft: 8 },
});
