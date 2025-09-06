// File: src/screens/AdminIncidentDetailScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { Incident } from "./AdminIncidentsScreen";
import type { Department } from "../services/department";

type Props = {
  visible: boolean;
  selected: Incident | null;
  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onUpdateStatus: (newStatus: Incident["status"], departmentId?: number | null) => Promise<void> | void;
  statusUpdating: boolean;
  departments: Department[]; // list fetched by AdminIncidentsScreen
};

export default function IncidentDetailModal({
  visible,
  selected,
  comment,
  setComment,
  onClose,
  onUpdateStatus,
  statusUpdating,
  departments,
}: Props) {
  // selected department id (number) or empty string for "none"
  const [chosenDepartment, setChosenDepartment] = useState<number | "" | null>("");
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  // init chosen department when a new incident is opened
  useEffect(() => {
    if (selected?.department !== undefined && selected?.department !== null) {
      setChosenDepartment(Number(selected.department));
    } else {
      setChosenDepartment("");
    }
  }, [selected, visible]);

  if (!selected) return null;

  const chosenDepartmentId = typeof chosenDepartment === "number" ? chosenDepartment : null;

  const handleUpdate = async (status: Incident["status"]) => {
    if (!comment?.trim()) {
      Alert.alert("Comment required", "Please add a comment before updating status.");
      return;
    }
    if (chosenDepartmentId === null) {
      Alert.alert("Select department", "Please select a department for this incident.");
      return;
    }
    try {
      await onUpdateStatus(status, chosenDepartmentId);
    } catch (err: any) {
      console.warn("updateStatus error:", err);
      Alert.alert("Failed", err?.message ?? "Failed to update incident");
    }
  };

  const selectedDept = departments.find((d) => Number(d.id) === Number(chosenDepartment));
  const selectedDeptName = selectedDept?.name ?? selected.department_name ?? "Unassigned";
  const selectedDeptDesc = selectedDept?.description ?? "";

  return (
    <>
      {/* Main detail modal */}
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
              <Ionicons name="chevron-down" size={26} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Incident Details</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Top card */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, styles.iconShadow]}>
                  <Ionicons name="alert-circle-outline" size={26} color="#0369a1" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={3}>
                    {selected.title || "No title"}
                  </Text>

                  {/* Type and address on separate lines so address can wrap */}
                  <Text style={styles.typeText}>{selected.type || "—"}</Text>
                  <Text style={styles.addressText} numberOfLines={3}>
                    {selected.address || "—"}
                  </Text>

                  <Text style={styles.metaSmall}>
                    {selected.reportedAt ? new Date(selected.reportedAt).toLocaleString() : "—"}
                  </Text>
                </View>

                <View style={styles.statusWrap}>
                  <View style={[styles.statusPill, selected.status === "Resolved" ? styles.statusResolved : styles.statusActive]}>
                    <Text style={styles.statusText}>{selected.status}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Photos */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Photos</Text>
              {selected.photos && selected.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }} style={{ marginTop: 8 }}>
                  {selected.photos.map((p, idx) => (
                    <TouchableOpacity key={idx} activeOpacity={0.9} style={styles.photoCard}>
                      <Image source={{ uri: p }} style={styles.photoImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No photos available</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionText}>{selected.description ?? "—"}</Text>
              </View>
            </View>

            {/* Department selector (custom) */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Department</Text>

              <TouchableOpacity
                style={styles.departmentButton}
                onPress={() => setDeptModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.departmentLabel}>{selectedDeptName}</Text>
                  {selectedDeptDesc ? <Text style={styles.departmentDesc} numberOfLines={2}>{selectedDeptDesc}</Text> : null}
                </View>

                <View style={styles.departmentRight}>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Comment */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Comment</Text>
              <View style={styles.sectionCard}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write your instruction or note..."
                  multiline
                  value={comment}
                  onChangeText={setComment}
                  editable={!statusUpdating}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#f97316", marginRight: 10 }]}
                onPress={() => handleUpdate("Acknowledged")}
                disabled={statusUpdating}
                activeOpacity={0.85}
              >
                {statusUpdating ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-done-outline" size={18} color="#fff" />}
                <Text style={[styles.btnText, { marginLeft: 8 }]}>Acknowledge</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#10b981" }]}
                onPress={() => handleUpdate("Resolved")}
                disabled={statusUpdating}
                activeOpacity={0.85}
              >
                {statusUpdating ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-outline" size={18} color="#fff" />}
                <Text style={[styles.btnText, { marginLeft: 8 }]}>Resolve</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Department selection modal */}
      <Modal visible={deptModalVisible} animationType="fade" transparent onRequestClose={() => setDeptModalVisible(false)}>
        <TouchableOpacity style={styles.deptOverlay} activeOpacity={1} onPress={() => setDeptModalVisible(false)}>
          <View />
        </TouchableOpacity>

        <View style={styles.deptSheet}>
          <View style={styles.deptHeader}>
            <Text style={styles.deptTitle}>Select Department</Text>
            <TouchableOpacity onPress={() => setDeptModalVisible(false)} style={{ padding: 6 }}>
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={departments}
            keyExtractor={(d) => String(d.id)}
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator
            renderItem={({ item }) => {
              const isSelected = Number(item.id) === Number(chosenDepartment);
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setChosenDepartment(Number(item.id));
                    setDeptModalVisible(false);
                  }}
                  style={[styles.deptRow, isSelected && styles.deptRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deptName, isSelected && { color: "#0369a1" }]}>{item.name}</Text>
                    {item.description ? <Text style={styles.deptSmall}>{item.description}</Text> : null}
                  </View>
                  {isSelected ? <Ionicons name="checkmark" size={18} color="#0369a1" /> : null}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#eef2ff", marginVertical: 6 }} />}
          />
        </View>
      </Modal>
    </>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff" },

  header: {
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ff",
    flexDirection: "row",
    alignItems: "center",
  },
  headerLeft: { padding: 8 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#0f172a" },
  headerRight: { width: 40 },

  content: { paddingHorizontal: 16, paddingTop: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  iconShadow: {
    ...Platform.select({ ios: { shadowColor: "#0369a1", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 1 } }),
  },
  cardBody: { flex: 1, paddingLeft: 12 },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  typeText: { marginTop: 8, color: "#64748b", fontWeight: "700", fontSize: 13 },
  addressText: { marginTop: 4, color: "#475569", fontSize: 14, lineHeight: 18 },

  metaSmall: { marginTop: 8, color: "#94a3af", fontSize: 12 },

  statusWrap: { alignItems: "flex-end", paddingLeft: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  statusResolved: { backgroundColor: "#16a34a" },
  statusActive: { backgroundColor: "#f97316" },

  sectionTitle: { fontWeight: "700", color: "#0f172a", marginBottom: 6, fontSize: 13 },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  sectionText: { color: "#475569", fontSize: 14, lineHeight: 20 },

  photoCard: {
    width: 220,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: "100%", height: "100%" },

  emptyBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  emptyText: { color: "#94a3b8" },

  departmentButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  departmentLabel: { fontWeight: "700", color: "#0f172a", fontSize: 14 },
  departmentDesc: { marginTop: 6, color: "#64748b", fontSize: 12 },

  departmentRight: { marginLeft: 10 },

  commentInput: {
    minHeight: 110,
    textAlignVertical: "top",
    padding: 0,
    fontSize: 14,
    color: "#0f172a",
  },

  actionsRow: { marginTop: 16, flexDirection: "row", gap: 12, justifyContent: "space-between" },
  primaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  /* dept modal styles */
  deptOverlay: { flex: 1, backgroundColor: "rgba(3, 7, 18, 0.45)" },
  deptSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: Platform.OS === "ios" ? 120 : 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    maxHeight: 420,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16 }, android: { elevation: 6 } }),
  },
  deptHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  deptTitle: { fontWeight: "800", color: "#0f172a" },
  deptRow: { paddingVertical: 10, paddingHorizontal: 6, flexDirection: "row", alignItems: "center" },
  deptRowSelected: { backgroundColor: "#f1f8ff", borderRadius: 8 },
  deptName: { fontWeight: "700", color: "#0f172a" },
  deptSmall: { color: "#64748b", marginTop: 4, fontSize: 12 },
});
