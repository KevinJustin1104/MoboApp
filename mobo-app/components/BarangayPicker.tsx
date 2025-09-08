// components/BarangayPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { Barangay } from "../services/barangays";
import { listBarangays } from "../services/barangays";

type Props = {
  value?: { id?: number | null; name?: string | null } | null;
  onChange: (b: { id?: number | null; name: string }) => void;

  /** Optional defaults from the signed-in user profile */
  initialBarangayId?: number | null;
  initialBarangayName?: string | null;

  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export default function BarangayPicker({
  value,
  onChange,
  initialBarangayId,
  initialBarangayName,
  label = "Barangay",
  placeholder = "Select barangay…",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ id?: number | null; name: string } | null>(
    value && typeof value.name === "string" && value.name !== null
      ? { id: value.id ?? null, name: value.name }
      : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load options (with debounce on search)
  const fetchList = async (q?: string) => {
    try {
      setLoading(true);
      const rows = await listBarangays(q, 200);
      setData(rows || []);
    } catch (e) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList(search.trim() || undefined), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Preselect from user profile once, if no explicit value yet
  useEffect(() => {
    if (value?.name) return; // parent already set something
    if (selected?.name) return;
    if (initialBarangayName) {
      setSelected({ id: initialBarangayId ?? null, name: initialBarangayName });
      onChange({ id: initialBarangayId ?? null, name: initialBarangayName });
    }
  }, [initialBarangayId, initialBarangayName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep internal state in sync if parent controls it
  useEffect(() => {
    if (value && value.name !== selected?.name) {
      setSelected(value?.name ? { id: value.id ?? null, name: value.name } : null);
    }
  }, [value]);

  const labelText = useMemo(() => selected?.name || placeholder, [selected, placeholder]);

  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selector,
          disabled && { opacity: 0.6 },
          pressed && { opacity: 0.9 },
        ]}
        android_ripple={{ color: "#eef6ff" }}
        accessibilityLabel="Open barangay picker"
      >
        <Ionicons name="home-outline" size={18} color="#64748b" />
        <Text
          style={[styles.selectorText, !selected?.name && { color: "#94a3b8" }]}
          numberOfLines={1}
        >
          {labelText}
        </Text>

        {selected?.name ? (
          <Pressable
            onPress={() => {
              setSelected(null);
              onChange({ id: null, name: "" });
            }}
            hitSlop={8}
            style={{ padding: 6 }}
          >
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </Pressable>
        ) : null}

        <Ionicons name="chevron-down" size={18} color="#94a3b8" />
      </Pressable>

      {/* Modal list */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setOpen(false)} style={{ padding: 6 }}>
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </Pressable>
            <Text style={styles.modalTitle}>Select Barangay</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search barangay…"
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0369a1" />
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(b) => String(b.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const isActive =
                  selected?.id != null
                    ? selected?.id === item.id
                    : selected?.name?.toLowerCase().trim() === item.name.toLowerCase().trim();

                return (
                  <Pressable
                    onPress={() => {
                      setSelected({ id: item.id, name: item.name });
                      onChange({ id: item.id, name: item.name });
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      isActive && styles.rowActive,
                      pressed && { opacity: 0.9 },
                    ]}
                    android_ripple={{ color: "#eef6ff" }}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBubble, { backgroundColor: "#e6f0ff" }]}>
                        <Ionicons name="location-outline" size={16} color="#2563eb" />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      {!!item.code && (
                        <Text style={styles.rowSub} numberOfLines={1}>
                          Code: {item.code}
                        </Text>
                      )}
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 32 }}>
                  <Ionicons name="alert-circle" size={40} color="#cbd5e1" />
                  <Text style={{ marginTop: 8, color: "#64748b" }}>No barangays found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: "#0f172a", fontWeight: "700" },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#e6eef6",
  },
  selectorText: { flex: 1, color: "#0f172a", fontWeight: "600" },

  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e6eef6",
  },
  modalTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  searchBox: {
    margin: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#e6eef6",
  },
  searchInput: { flex: 1, height: "100%", fontSize: 14 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  rowActive: { borderColor: "#22c55e55", backgroundColor: "#f0fff455" },
  rowLeft: { width: 40, alignItems: "center" },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontWeight: "700", color: "#0f172a" },
  rowSub: { color: "#64748b", fontSize: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
