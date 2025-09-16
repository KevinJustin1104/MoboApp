// src/screens/AdminAppointmentServiceCreateScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { postAdminService } from "../services/appointments";
import { getDepartments, type Department } from "../services/department";
import FeedbackModal from "../components/SuccessMessage"; // ← our reusable modal

export default function AdminAppointmentServiceCreateScreen() {
  const nav = useNavigation<any>();

  // form
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("15");
  const [capacity, setCapacity] = useState("1");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // feedback modal state
  const [dialog, setDialog] = useState<{
    visible: boolean;
    variant: "success" | "error" | "info";
    title?: string;
    message: string;
    afterClose?: () => void;
  }>({ visible: false, variant: "success", message: "" });

  // departments
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const selectedDept =
    departmentId ? departments.find((d) => String(d.id) === departmentId) : undefined;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setDeptLoading(true);
      try {
        const list = await getDepartments();
        if (mounted) setDepartments(list || []);
      } catch {
        if (mounted) setDepartments([]);
      } finally {
        if (mounted) setDeptLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    const dur = Number(duration) || 15;
    const cap = Number(capacity) || 1;

    if (!name.trim()) return Alert.alert("Validation", "Service name is required.");
    if (!departmentId) return Alert.alert("Validation", "Please select a department.");
    if (dur < 5 || dur > 240) return Alert.alert("Validation", "Duration must be 5..240 minutes.");
    if (cap < 1 || cap > 50) return Alert.alert("Validation", "Capacity per slot must be 1..50.");

    setSaving(true);
    try {
      await postAdminService({
        name: name.trim(),
        department_id: Number(departmentId),
        description: description.trim() || null,
        duration_min: dur,
        capacity_per_slot: cap,
        is_active: active,
      });

      // Show success modal; go back after close
      setDialog({
        visible: true,
        variant: "success",
        title: "Service created",
        message: "The new appointment service has been saved.",
        afterClose: () => nav.goBack(),
      });
    } catch (e: any) {
      // Show error modal
      setDialog({
        visible: true,
        variant: "error",
        title: "Failed to create service",
        message: e?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f6f8fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Barangay Clearance"
            value={name}
            onChangeText={setName}
          />

          {/* Department selector (uses API) */}
          <Text style={styles.label}>Department (required)</Text>
          <TouchableOpacity
            style={styles.select}
            activeOpacity={0.8}
            onPress={() => setDeptOpen(true)}
          >
            <Text
              style={!selectedDept ? styles.selectPlaceholder : styles.selectText}
              numberOfLines={1}
            >
              {selectedDept ? selectedDept.name : "Select department"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: "top" }]}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Shown to citizens when booking"
          />

          {/* Duration / Capacity */}
          <View style={{ flexDirection: "row", gap: 10 as any }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Duration (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Capacity per slot</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
          </View>

          {/* Active */}
          <View style={styles.switchRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving..." : "Create Service"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Department Modal (unchanged) */}
      <Modal visible={deptOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose department</Text>
              <TouchableOpacity onPress={() => setDeptOpen(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {deptLoading ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: "#64748b" }}>Loading…</Text>
                </View>
              ) : departments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: "#64748b" }}>No departments found</Text>
                </View>
              ) : (
                departments.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.deptRow}
                    onPress={() => {
                      setDepartmentId(String(d.id));
                      setDeptOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deptName}>{d.name}</Text>
                      {d.description ? (
                        <Text style={styles.deptDesc} numberOfLines={2}>
                          {d.description}
                        </Text>
                      ) : null}
                    </View>
                    {String(d.id) === departmentId ? (
                      <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setDepartmentId("");
                  setDeptOpen(false);
                }}
              >
                <Text style={styles.clearText}>Clear selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reusable success/error modal */}
      <FeedbackModal
        visible={dialog.visible}
        variant={dialog.variant}
        title={dialog.title}
        message={dialog.message}
        onClose={() => {
          const next = dialog.afterClose;
          setDialog((d) => ({ ...d, visible: false, afterClose: undefined }));
          next?.();
        }}
      />
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

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 10 as any },

  label: { color: "#475569", fontWeight: "700", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },

  // Select field (department)
  select: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectPlaceholder: { color: "#94a3b8" },
  selectText: { color: "#0f172a", fontWeight: "600" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  saveBtn: { marginTop: 16, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "800" },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  modalFooter: { paddingTop: 8 },

  emptyState: { paddingVertical: 26, alignItems: "center" },

  deptRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
  },
  deptName: { fontWeight: "700", color: "#0f172a" },
  deptDesc: { color: "#64748b", marginTop: 2, fontSize: 12 },

  iconBtn: { padding: 6, borderRadius: 8 },
  clearBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  clearText: { color: "#0f172a", fontWeight: "700" },
});
