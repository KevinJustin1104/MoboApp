// src/screens/AdminBarangaysScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Alert, Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Barangay, getBarangays, createBarangay, updateBarangay, deleteBarangay } from "../services/barangays";
import BackHeader from "../components/BackHeader";

export default function AdminBarangaysScreen() {
  const [items, setItems] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Barangay | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await getBarangays(query);
      setItems(data);
    } catch (e) {
      console.warn("getBarangays failed:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setModalOpen(true);
  };
  const openEdit = (b: Barangay) => {
    setEditing(b);
    setName(b.name);
    setCode(b.code || "");
    setModalOpen(true);
  };

  const onSave = async () => {
    const payload = { name: name.trim(), code: code.trim() || undefined };
    if (!payload.name) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateBarangay(editing.id, payload);
      } else {
        await createBarangay(payload);
      }
      setModalOpen(false);
      await load(q);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to save barangay";
      Alert.alert("Error", String(msg));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (b: Barangay) => {
    Alert.alert("Delete", `Delete barangay "${b.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteBarangay(b.id);
            await load(q);
          } catch (e: any) {
            const msg = e?.response?.data?.detail || "Failed to delete barangay";
            Alert.alert("Error", String(msg));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Barangays" />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or code"
          placeholderTextColor="#94a3af"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(q)}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={() => load(q)} style={styles.searchBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.9}>
        <Ionicons name="add-circle-outline" size={20} color="#0369a1" />
        <Text style={styles.addText}>Add Barangay</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#0369a1" /></View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No barangays found.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.code ? <Text style={styles.code}>Code: {item.code}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} accessibilityLabel="Edit">
                  <Ionicons name="create-outline" size={18} color="#0369a1" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.iconBtn} accessibilityLabel="Delete">
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Create/Edit modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "Edit Barangay" : "New Barangay"}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Poblacion"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Code (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. PSGC code"
                value={code}
                onChangeText={setCode}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={[styles.mbtn, styles.cancelBtn]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSave}
                disabled={busy}
                style={[styles.mbtn, styles.saveBtn, busy && { opacity: 0.6 }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff", padding: 16 },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 10,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  searchInput: { flex: 1, height: 44, paddingHorizontal: 8, color: "#0f172a" },
  searchBtn: { backgroundColor: "#0369a1", borderRadius: 8, padding: 8, marginLeft: 6 },
  addBtn: {
    marginTop: 12, alignSelf: "flex-start", backgroundColor: "#e6f2ff", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8 as any,
  },
  addText: { color: "#0369a1", fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCard: {
    marginTop: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  emptyText: { color: "#64748b" },

  row: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  name: { fontWeight: "800", color: "#0f172a" },
  code: { color: "#64748b", marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 as any, marginLeft: 8 },
  iconBtn: { padding: 10 },

  // modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(3,7,18,0.45)", alignItems: "center", justifyContent: "center" },
  modalCard: {
    width: "90%", maxWidth: 460, backgroundColor: "#fff", borderRadius: 12, padding: 16,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16 }, android: { elevation: 6 } }),
  },
  modalTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 12, fontSize: 16 },
  inputRow: { marginTop: 8 },
  inputLabel: { color: "#475569", marginBottom: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: "#0f172a" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 as any, marginTop: 14 },
  mbtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancelBtn: { backgroundColor: "#f1f5f9" },
  saveBtn: { backgroundColor: "#0369a1" },
  cancelText: { color: "#0f172a", fontWeight: "700" },
  saveText: { color: "#fff", fontWeight: "800" },
});
