// src/screens/AdminIncidentDetailScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
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
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { Incident } from "./AdminIncidentsScreen";
import type { Department } from "../services/department";
import {
  fetchIncidentComments,
  postIncidentComment,
  type IncidentComment,
} from "../services/incidents";

type Props = {
  visible: boolean;
  selected: Incident | null;

  // status-update note props
  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onUpdateStatus: (
    newStatus: Incident["status"],
    departmentId?: number | null
  ) => Promise<void> | void;
  statusUpdating: boolean;

  departments: Department[];
};

const formatDT = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

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
  const isOpen = visible && !!selected;

  // --- Local state (hooks must stay top-level & unconditional) ---
  const [chosenDepartment, setChosenDepartment] = useState<number | "" | null>("");
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  // comments
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // composer (admin adds comment; can reply to a comment)
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<IncidentComment | null>(null);

  // reflect selected.department into local state
  useEffect(() => {
    if (selected?.department !== undefined && selected?.department !== null) {
      setChosenDepartment(Number(selected.department));
    } else {
      setChosenDepartment("");
    }
  }, [selected?.department, isOpen]);

  // load comments
  const loadComments = useCallback(async () => {
    if (!selected?.id) return;
    setLoadingComments(true);
    try {
      const list = await fetchIncidentComments(String(selected.id));
      setComments(list);
    } catch (e) {
      console.warn("[Admin] fetchIncidentComments failed:", e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [selected?.id]);

  useEffect(() => {
    if (isOpen && selected?.id) {
      loadComments();
    } else {
      // reset when closed or no selection
      setComments([]);
      setComposerText("");
      setReplyTo(null);
    }
  }, [isOpen, selected?.id, loadComments]);

  const onRefresh = useCallback(async () => {
    if (!selected?.id) return;
    setRefreshing(true);
    try {
      await loadComments();
    } finally {
      setRefreshing(false);
    }
  }, [selected?.id, loadComments]);

  // status update handler
  const chosenDepartmentId = typeof chosenDepartment === "number" ? chosenDepartment : null;
  const handleUpdate = async (status: Incident["status"]) => {
    if (!comment?.trim()) {
      Alert.alert("Comment required", "Please add a note before updating status.");
      return;
    }
    if (chosenDepartmentId === null) {
      Alert.alert("Select department", "Please select a department for this incident.");
      return;
    }
    try {
      await onUpdateStatus(status, chosenDepartmentId);
      await loadComments();
    } catch (err: any) {
      console.warn("updateStatus error:", err);
      Alert.alert("Failed", err?.message ?? "Failed to update incident");
    }
  };

  // send a thread comment (admin)
  const sendComment = useCallback(async () => {
    const base = composerText.trim();
    if (!base) return;
    if (!selected?.id) {
      Alert.alert("Error", "Missing incident ID.");
      return;
    }

    // reply formatting
    const composed = replyTo
      ? `Reply to ${replyTo.author_name || replyTo.author_id || "comment"}:\n> ${replyTo.comment}\n\n${base}`
      : base;

    setSending(true);
    try {
      await postIncidentComment(String(selected.id), composed); // backend expects { comment }
      setComposerText("");
      setReplyTo(null);
      await loadComments();
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "Failed to post comment";
      Alert.alert("Error", String(detail));
    } finally {
      setSending(false);
    }
  }, [composerText, replyTo, selected?.id, loadComments]);

  const selectedDept = departments.find((d) => Number(d.id) === Number(chosenDepartment));
  const selectedDeptName = selectedDept?.name ?? selected?.department_name ?? "Unassigned";
  const selectedDeptDesc = selectedDept?.description ?? "";

  return (
    <>
      <Modal visible={isOpen} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerLeft} accessibilityLabel="Close details">
              <Ionicons name="chevron-down" size={26} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Incident Details</Text>
            <View style={styles.headerRight} />
          </View>

          {!selected ? (
            <View style={styles.center}>
              <ActivityIndicator color="#0369a1" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {/* Incident summary */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, styles.iconShadow]}>
                    <Ionicons name="alert-circle-outline" size={26} color="#0369a1" />
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.title} numberOfLines={3}>
                      {selected.title || "No title"}
                    </Text>
                    <Text style={styles.typeText}>{selected.type || "—"}</Text>
                    <Text style={styles.addressText} numberOfLines={3}>
                      {selected.address || "—"}
                    </Text>
                    <Text style={styles.metaSmall}>
                      {selected.reportedAt ? new Date(selected.reportedAt).toLocaleString() : "—"}
                    </Text>
                  </View>

                  <View style={styles.statusWrap}>
                    <View
                      style={[
                        styles.statusPill,
                        selected.status === "Resolved" ? styles.statusResolved : styles.statusActive,
                      ]}
                    >
                      <Text style={styles.statusText}>{selected.status}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionText}>{selected.description ?? "—"}</Text>
                </View>
              </View>

              {/* Photos */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionTitle}>Photos</Text>
                {selected.photos && selected.photos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    style={{ marginTop: 8 }}
                  >
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

              {/* Department selector */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionTitle}>Department</Text>
                <TouchableOpacity
                  style={styles.departmentButton}
                  onPress={() => setDeptModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.departmentLabel}>{selectedDeptName}</Text>
                    {selectedDeptDesc ? (
                      <Text style={styles.departmentDesc} numberOfLines={2}>
                        {selectedDeptDesc}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.departmentRight}>
                    <Ionicons name="chevron-down" size={18} color="#64748b" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Status update note */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionTitle}>Instruction / Note (for status update)</Text>
                <View style={styles.sectionCard}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write the note that will accompany the status update..."
                    multiline
                    value={comment}
                    onChangeText={setComment}
                    editable={!statusUpdating}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Actions (moved ABOVE comments) */}
              <View style={{ marginTop: 16 }}>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.btnAck]}
                    onPress={() => handleUpdate("Acknowledged")}
                    disabled={statusUpdating}
                    activeOpacity={0.9}
                  >
                    {statusUpdating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                    )}
                    <Text style={[styles.btnText, { marginLeft: 8 }]}>Acknowledge</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.btnResolve]}
                    onPress={() => handleUpdate("Resolved")}
                    disabled={statusUpdating}
                    activeOpacity={0.9}
                  >
                    {statusUpdating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    )}
                    <Text style={[styles.btnText, { marginLeft: 8 }]}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments thread */}
              <View style={{ marginTop: 18 }}>
                <Text style={styles.sectionTitle}>Updates & Comments</Text>

                {loadingComments ? (
                  <View style={[styles.sectionCard, { alignItems: "center" }]}>
                    <ActivityIndicator color="#0369a1" />
                  </View>
                ) : comments.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No comments yet.</Text>
                  </View>
                ) : (
                  <View style={styles.sectionCard}>
                    <FlatList
                      data={comments}
                      keyExtractor={(c) => String(c.id)}
                      renderItem={({ item }) => (
                        <View style={styles.threadRow}>
                          <Ionicons
                            name="person-circle-outline"
                            size={28}
                            color="#94a3b8"
                            style={{ marginRight: 8 }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={styles.threadHeader}>
                              <Text style={styles.threadAuthor}>{item.author_name || "User"}</Text>
                              <Text style={styles.threadTime}>{formatDT(item.created_at)}</Text>
                            </View>
                            <Text style={styles.threadMsg}>{item.comment}</Text>

                            <TouchableOpacity
                              onPress={() => setReplyTo(item)}
                              style={styles.replyBtn}
                              accessibilityLabel="Reply to comment"
                            >
                              <Ionicons name="chatbox-ellipses-outline" size={14} color="#0369a1" />
                              <Text style={styles.replyText}>Reply</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {/* Reply preview */}
                {replyTo && (
                  <View style={[styles.sectionCard, styles.replyPreview]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.replyPreviewTitle}>
                        Replying to {replyTo.author_name || "comment"}
                      </Text>
                      <Text style={styles.replyPreviewBody} numberOfLines={2}>
                        {replyTo.comment}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 6 }}>
                      <Ionicons name="close" size={18} color="#475569" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Composer */}
                <View style={[styles.sectionCard, { marginTop: 8 }]}>
                  <View style={styles.composerRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475569" />
                    <TextInput
                      style={styles.composerInput}
                      placeholder="Write a comment…"
                      placeholderTextColor="#9ca3af"
                      value={composerText}
                      onChangeText={setComposerText}
                      multiline
                      editable={!sending}
                    />
                  </View>

                  <View style={styles.composerActions}>
                    <View />
                    <TouchableOpacity
                      onPress={sendComment}
                      disabled={sending || !composerText.trim()}
                      style={[
                        styles.sendBtn,
                        (sending || !composerText.trim()) && styles.sendBtnDisabled,
                      ]}
                      activeOpacity={0.9}
                    >
                      {sending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.sendText}>Send</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ height: 28 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Department picker modal */}
      <Modal
        visible={deptModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.deptOverlay}
          activeOpacity={1}
          onPress={() => setDeptModalVisible(false)}
        >
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
                    <Text style={[styles.deptName, isSelected && { color: "#0369a1" }]}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.deptSmall}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={18} color="#0369a1" />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: "#eef2ff", marginVertical: 6 }} />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

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
    ...Platform.select({
      ios: { shadowColor: "#0369a1", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
    }),
  },
  cardBody: { flex: 1, paddingLeft: 12 },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  typeText: { marginTop: 8, color: "#64748b", fontWeight: "700", fontSize: 13 },
  addressText: { marginTop: 4, color: "#475569", fontSize: 14, lineHeight: 18 },
  metaSmall: { marginTop: 8, color: "#94a3af", fontSize: 12 },

  statusWrap: { alignItems: "flex-end", paddingLeft: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  statusResolved: { backgroundColor: "#16a34a" },
  statusActive: { backgroundColor: "#f97316" },

  sectionTitle: { fontWeight: "700", color: "#0f172a", marginBottom: 6, fontSize: 13 },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
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

  // Actions
  actionsRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnAck: { backgroundColor: "#f97316" },
  btnResolve: { backgroundColor: "#10b981" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Thread list
  threadRow: { flexDirection: "row", alignItems: "flex-start" },
  threadHeader: { flexDirection: "row", justifyContent: "space-between" },
  threadAuthor: { fontWeight: "800", color: "#0f172a" },
  threadTime: { color: "#94a3af", fontSize: 12, marginLeft: 8 },
  threadMsg: { color: "#374151", marginTop: 6, lineHeight: 18 },
  replyBtn: {
    flexDirection: "row",
    gap: 6 as any,
    alignItems: "center",
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  replyText: { color: "#0369a1", fontWeight: "700", fontSize: 12 },

  // Composer
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
    marginTop: 8,
  },
  replyPreviewTitle: { fontWeight: "800", color: "#0f172a" },
  replyPreviewBody: { color: "#475569", marginTop: 4 },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
    borderWidth: 1,
    borderColor: "#e6eef6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerInput: { flex: 1, minHeight: 38, maxHeight: 120, color: "#0f172a" },
  composerActions: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sendBtn: {
    backgroundColor: "#0369a1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: "#fff", fontWeight: "800" },

  // Dept modal
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
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  deptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  deptTitle: { fontWeight: "800", color: "#0f172a" },
  deptRow: { paddingVertical: 10, paddingHorizontal: 6, flexDirection: "row", alignItems: "center" },
  deptRowSelected: { backgroundColor: "#f1f8ff", borderRadius: 8 },
  deptName: { fontWeight: "700", color: "#0f172a" },
  deptSmall: { color: "#64748b", marginTop: 4, fontSize: 12 },
});
