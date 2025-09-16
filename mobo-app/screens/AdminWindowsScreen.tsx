// src/screens/admin/AdminWindowsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation";
import { getDepartments, type Department } from "../services/department";
import {
  adminListWindows,
  adminCreateWindow,
  adminUpdateWindow,
  adminDeleteWindow,
  adminOpenWindow,
  adminCloseWindow,
  type OfficeWindow,
} from "../services/queue";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdminWindows">;

export default function AdminWindowsScreen() {
  const nav = useNavigation<Nav>();

  const [loading, setLoading] = useState(false);
  const [windows, setWindows] = useState<OfficeWindow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState<number | null>(null);

  // pickers / modals
  const [deptModal, setDeptModal] = useState(false);

  // create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formName, setFormName] = useState("");
  const [formDeptId, setFormDeptId] = useState<number | null>(null);
  const [editingWindow, setEditingWindow] = useState<OfficeWindow | null>(null);
  const [saving, setSaving] = useState(false);

  // load departments once
  useEffect(() => {
    (async () => {
      try {
        const deps = await getDepartments();
        setDepartments(deps || []);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminListWindows(deptFilter ?? undefined);
      setWindows(list);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load windows.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFilter]);

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === deptFilter) || null,
    [departments, deptFilter]
  );
  const formDept = useMemo(
    () => departments.find((d) => d.id === formDeptId) || null,
    [departments, formDeptId]
  );

  const openCreate = () => {
    setFormMode("create");
    setFormName("");
    setFormDeptId(deptFilter ?? null); // prefill from filter if set
    setEditingWindow(null);
    setFormOpen(true);
  };

  const openEdit = (w: OfficeWindow) => {
    setFormMode("edit");
    setFormName(w.name);
    setFormDeptId(w.department_id); // not editable (PATCH schema), but show
    setEditingWindow(w);
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!formName.trim()) return Alert.alert("Validation", "Window name is required.");
    if (formMode === "create") {
      if (!formDeptId) return Alert.alert("Validation", "Please choose a department.");
      setSaving(true);
      try {
        await adminCreateWindow(formDeptId, formName.trim());
        setFormOpen(false);
        await load();
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to create window.");
      } finally {
        setSaving(false);
      }
    } else {
      // edit name (department change not supported by PATCH on backend)
      if (!editingWindow) return;
      setSaving(true);
      try {
        await adminUpdateWindow(editingWindow.id, { name: formName.trim() });
        setFormOpen(false);
        await load();
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to update window.");
      } finally {
        setSaving(false);
      }
    }
  };

  const confirmDelete = (w: OfficeWindow) => {
    Alert.alert("Delete window", `Delete "${w.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminDeleteWindow(w.id);
            await load();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to delete window.");
          }
        },
      },
    ]);
  };

  const toggleOpen = async (w: OfficeWindow) => {
    try {
      if (w.is_open) {
        await adminCloseWindow(w.id);
      } else {
        await adminOpenWindow(w.id);
      }
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to change window status.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f6f8fb" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Windows / Counters</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Toolbar */}
        <View style={styles.toolbar}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setDeptModal(true)}>
            <Ionicons name="funnel-outline" size={16} color="#0f172a" />
            <Text style={styles.filterText}>{selectedDept ? selectedDept.name : "All departments"}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#16a34a" }]}
            onPress={() => nav.navigate("AdminCheckin" as never)}
            >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Check-in</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryText}>New window</Text>
            </TouchableOpacity>
        </View>
        </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator />
          </View>
        ) : windows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: "#64748b" }}>No windows found</Text>
          </View>
        ) : (
          windows.map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{w.name}</Text>
                  <Text style={styles.meta}>Dept #{w.department_id}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: w.is_open ? "#22c55e" : "#ef4444" },
                      ]}
                    />
                    <Text style={{ color: "#475569" }}>
                      {w.is_open ? "Open" : "Closed"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: w.is_open ? "#fee2e2" : "#dcfce7" }]}
                    onPress={() => toggleOpen(w)}
                  >
                    <Ionicons name={w.is_open ? "close-circle-outline" : "play-circle-outline"} size={18} color={w.is_open ? "#ef4444" : "#16a34a"} />
                    <Text style={[styles.smallText, { color: w.is_open ? "#ef4444" : "#16a34a" }]}>
                      {w.is_open ? "Close" : "Open"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(w)}>
                    <Ionicons name="create-outline" size={18} color="#0f172a" />
                    <Text style={styles.smallText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#fee2e2" }]}
                    onPress={() => confirmDelete(w)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.smallText, { color: "#ef4444" }]}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => nav.navigate("AdminWindowDetail", { window: w })}
                  >
                    <Ionicons name="navigate-outline" size={18} color="#2563eb" />
                    <Text style={styles.manageText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Department filter modal */}
      <Modal visible={deptModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by department</Text>
              <TouchableOpacity onPress={() => setDeptModal(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  setDeptFilter(null);
                  setDeptModal(false);
                }}
              >
                <Text style={styles.optionText}>All departments</Text>
                {deptFilter === null ? <Ionicons name="checkmark-circle" size={20} color="#2563eb" /> : null}
              </TouchableOpacity>
              {departments.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.optionRow}
                  onPress={() => {
                    setDeptFilter(d.id);
                    setDeptModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{d.name}</Text>
                  {deptFilter === d.id ? <Ionicons name="checkmark-circle" size={20} color="#2563eb" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create / Edit modal */}
      <Modal visible={formOpen} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formMode === "create" ? "New window" : "Edit window"}</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g., Window 1"
            />

            <Text style={styles.label}>Department</Text>
            {formMode === "edit" ? (
              <View style={[styles.input, { justifyContent: "center" }]}>
                <Text style={{ color: "#0f172a", fontWeight: "600" }}>
                  {formDept?.name || `Dept #${formDeptId}`}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>Department cannot be changed</Text>
              </View>
            ) : (
              <View style={[styles.input, { paddingVertical: 0 }]}>
                <ScrollView style={{ maxHeight: 150 }}>
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.optionRowTight}
                      onPress={() => setFormDeptId(d.id)}
                    >
                      <Text style={styles.optionText}>{d.name}</Text>
                      {formDeptId === d.id ? (
                        <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtnWide} onPress={submitForm} disabled={saving}>
              <Text style={styles.primaryTextWhite}>{saving ? "Saving..." : formMode === "create" ? "Create" : "Save changes"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 6 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  filterText: { color: "#0f172a", fontWeight: "700" },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2563eb", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: "#fff", fontWeight: "800" },

  primaryBtnWide: { marginTop: 14, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryTextWhite: { color: "#fff", fontWeight: "800" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 12, elevation: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  meta: { color: "#64748b", marginTop: 2 },

  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  actions: { alignItems: "flex-end", gap: 8 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f1f5f9" },
  smallText: { color: "#0f172a", fontWeight: "700" },

  manageBtn: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe" },
  manageText: { color: "#2563eb", fontWeight: "800" },

  emptyState: { padding: 24, alignItems: "center" },

  // modals
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "flex-end" },
  modalBackdropCenter: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#fff", padding: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  formCard: { width: "90%", backgroundColor: "#fff", padding: 16, borderRadius: 14 },

  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  iconBtn: { padding: 6, borderRadius: 8 },

  optionRow: { paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionRowTight: { paddingVertical: 10, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionText: { color: "#0f172a", fontWeight: "600" },

  label: { color: "#475569", fontWeight: "700", marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#fff", marginTop: 6 },
});
