// src/screens/IncidentStatusScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../navigation";
import client from "../services/api";
import {
  getIncident,
  fetchIncidentComments,
  postIncidentComment,
  type IncidentComment,
} from "../services/incidents";
import type { ViewStyle } from "react-native";

type IncidentStatusRoute = RouteProp<RootStackParamList, "IncidentStatus">;

const formatDT = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const STATUS_ORDER = ["Submitted", "Acknowledged", "In Progress", "Resolved"];
const statusToIndex = (status?: string) => {
  if (!status) return 0;
  const idx = STATUS_ORDER.findIndex((s) => s.toLowerCase() === String(status).toLowerCase());
  return idx >= 0 ? idx : 0;
};

// ---- Dynamic style helpers (FIX for callable style) ----
const getStatusColor = (status?: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "#16a34a";
  if (s === "in progress") return "#0ea5e9";
  if (s === "acknowledged") return "#f97316";
  return "#64748b";
};
const statusPillStyle = (status?: string): ViewStyle => ({
  backgroundColor: getStatusColor(status),
});

export default function IncidentStatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<IncidentStatusRoute>();
  const { incidentId, notificationId }: any = route.params ?? {};
  const { width } = useWindowDimensions();

  // data
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // comments
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // composer
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<IncidentComment | null>(null);
  const [markFollowUp, setMarkFollowUp] = useState(false);

  // photos carousel
  const [photoIndex, setPhotoIndex] = useState(0);
  const photosScrollRef = useRef<ScrollView>(null);

  const loadIncidentByNotification = useCallback(async (nid: string) => {
    try {
      const res = await client.get("/notifications");
      const found = res.data?.find((x: any) => x.id === nid);
      return found?.incident_id ?? null;
    } catch (e) {
      console.warn("Failed to fetch notification list:", e);
      return null;
    }
  }, []);

  const loadIncident = useCallback(async (id: string) => {
    const inc = await getIncident(id);
    setIncident(inc);
  }, []);

  const loadComments = useCallback(async (id: string) => {
    try {
      const list = await fetchIncidentComments(id);
      setComments(list);
    } catch (e) {
      console.warn("fetchIncidentComments failed:", e);
      setComments([]);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let idToFetch = incidentId ?? null;
      if (!idToFetch && notificationId) {
        idToFetch = await loadIncidentByNotification(notificationId);
      }
      if (!idToFetch) {
        setError("No incident id provided.");
        setIncident(null);
        setComments([]);
        return;
      }
      await loadIncident(idToFetch);
      await loadComments(idToFetch);
    } catch (err: any) {
      console.warn("Failed to load incident", err);
      setError(err?.response?.data?.detail || "Failed to fetch incident");
      setIncident(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [incidentId, notificationId, loadIncidentByNotification, loadIncident, loadComments]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onRefresh = useCallback(async () => {
    if (!incident?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([loadIncident(incident.id), loadComments(incident.id)]);
    } finally {
      setRefreshing(false);
    }
  }, [incident, loadIncident, loadComments]);

  const steps = useMemo(() => {
    if (!incident) return [];
    const currentIndex = statusToIndex(incident.status);
    return STATUS_ORDER.map((label, idx) => ({
      label,
      done: idx <= currentIndex,
      at: idx === 0 ? incident.created_at : undefined,
    }));
  }, [incident]);

  const sendComment = useCallback(async () => {
    const base = commentText.trim();
    if (!base) return;

    const composed =
      markFollowUp
        ? `Follow-up: ${base}`
        : replyTo
        ? `Reply to ${replyTo.author_name || replyTo.author_id || "comment"}:\n> ${replyTo.comment}\n\n${base}`
        : base;

    if (!incident?.id) {
      Alert.alert("Error", "Missing incident ID.");
      return;
    }

    setSending(true);
    try {
      await postIncidentComment(String(incident.id), composed); // backend expects { comment: string }
      setCommentText("");
      setReplyTo(null);
      setMarkFollowUp(false);
      await loadComments(String(incident.id));
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "Failed to post comment";
      Alert.alert("Error", String(detail));
    } finally {
      setSending(false);
    }
  }, [commentText, markFollowUp, replyTo, incident, loadComments]);

  const onPhotosScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const ix = Math.round(e.nativeEvent.contentOffset.x / (width - 32)); // 16px padding on both sides
    setPhotoIndex(ix);
  };

  // ---- RENDER ----

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Incident Status
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {error ? (
        <View style={[styles.center, { padding: 24 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !incident ? (
        <View style={[styles.center, { padding: 24 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No status available.</Text>
        </View>
      ) : (
        <>
          {/* Content scroll; leave bottom padding for composer */}
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconWrap}>
                  <Ionicons name="alert-circle-outline" size={22} color="#0369a1" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {incident.title || "No title"}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="pricetag-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{incident.type_name ?? incident.type ?? "—"}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText} numberOfLines={2}>
                      {incident.address ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>Reported: {formatDT(incident.created_at)}</Text>
                  </View>
                </View>

                <View style={[styles.statusPill, statusPillStyle(incident.status)]}>
                  <Text style={styles.statusText}>{incident.status}</Text>
                </View>
              </View>

              {/* Photos */}
              {!!incident.photos?.length && (
                <View style={{ marginTop: 12 }}>
                  <ScrollView
                    ref={photosScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onPhotosScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingVertical: 4 }}
                  >
                    {incident.photos.map((uri: string, idx: number) => (
                      <View key={idx} style={[styles.photoSlide, { width: width - 32 }]}>
                        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>

                  {/* Dots */}
                  <View style={styles.dotsRow}>
                    {incident.photos.map((_: any, idx: number) => (
                      <View key={idx} style={[styles.dot, idx === photoIndex && styles.dotActive]} />
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Progress */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Progress</Text>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(statusToIndex(incident.status) / (STATUS_ORDER.length - 1)) * 100}%` },
                  ]}
                />
              </View>

              <View style={styles.stepsRow}>
                {STATUS_ORDER.map((label, i) => {
                  const done = i <= statusToIndex(incident.status);
                  return (
                    <View key={label} style={styles.stepItem}>
                      <View style={[styles.stepBullet, done ? styles.stepBulletDone : styles.stepBulletTodo]}>
                        {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                      </View>
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Comments */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Updates & Comments</Text>

              {comments.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No comments yet.</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(c) => String(c.id)}
                  renderItem={({ item }) => (
                    <View style={styles.commentRow}>
                      <View style={{ marginRight: 8 }}>
                        <Ionicons name="person-circle-outline" size={32} color="#94a3b8" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{item.author_name || "User"}</Text>
                          <Text style={styles.commentTime}>{formatDT(item.created_at)}</Text>
                        </View>
                        <Text style={styles.commentMsg}>{item.comment}</Text>

                        <TouchableOpacity
                          style={styles.replyBtn}
                          onPress={() => setReplyTo(item)}
                          accessibilityLabel="Reply to comment"
                        >
                          <Ionicons name="chatbox-ellipses-outline" size={14} color="#0369a1" />
                          <Text style={styles.replyText}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  scrollEnabled={false}
                  contentContainerStyle={{ paddingTop: 6 }}
                />
              )}
            </View>
          </ScrollView>

          {/* Sticky Composer */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
            style={styles.composerWrap}
          >
            {/* Reply preview */}
            {replyTo && (
              <View style={styles.replyPreview}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyPreviewTitle}>
                    Replying to {replyTo.author_name || "comment"}
                  </Text>
                  <Text style={styles.replyPreviewBody} numberOfLines={2}>
                    {replyTo.comment}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyTo(null)}
                  style={{ padding: 6 }}
                  accessibilityLabel="Cancel reply"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.composerBar}>
              <View style={styles.composerInputWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#64748b" />
                <TextInput
                  style={styles.composerInput}
                  placeholder="Write a comment or follow-up…"
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  accessibilityLabel="Write a comment"
                  editable={!sending}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
                disabled={!commentText.trim() || sending}
                onPress={sendComment}
                accessibilityLabel="Send comment"
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setMarkFollowUp((s) => !s)}
              style={[styles.followChip, markFollowUp && styles.followChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: markFollowUp }}
            >
              <Ionicons
                name={markFollowUp ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={markFollowUp ? "#0369a1" : "#64748b"}
              />
              <Text style={[styles.followChipText, markFollowUp && { color: "#0369a1", fontWeight: "700" }]}>
                Mark as follow-up
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff" },
  center: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ff",
  },
  headerBtn: { width: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#0f172a" },

  content: { paddingHorizontal: 16, paddingTop: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },

  // Hero
  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#eef6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 as any, marginTop: 6 },
  metaText: { color: "#475569", flexShrink: 1 },

  statusPill: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  // Photos
  photoSlide: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    marginRight: 12,
  },
  photo: { width: "100%", height: "100%" },
  dotsRow: { flexDirection: "row", alignSelf: "center", marginTop: 8, gap: 6 as any },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd5e1" },
  dotActive: { backgroundColor: "#0369a1", width: 16, borderRadius: 3 },

  // Progress
  sectionTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  progressBarTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 999 },
  progressBarFill: { height: 6, backgroundColor: "#0369a1", borderRadius: 999 },
  stepsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  stepItem: { alignItems: "center", width: `${100 / STATUS_ORDER.length}%` as any },
  stepBullet: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepBulletDone: { backgroundColor: "#10b981" },
  stepBulletTodo: { backgroundColor: "#e5e7eb" },
  stepLabel: { marginTop: 6, fontSize: 11, color: "#475569", fontWeight: "600" },
  stepLabelDone: { color: "#065f46" },

  // Comments
  emptyBox: {
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  emptyText: { color: "#6b7280", marginTop: 6, textAlign: "center" },
  commentRow: { flexDirection: "row", paddingVertical: 8 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commentAuthor: { fontWeight: "800", color: "#0f172a" },
  commentTime: { color: "#9ca3af", fontSize: 12, marginLeft: 8 },
  commentMsg: { color: "#374151", marginTop: 6, lineHeight: 18 },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 6 as any, marginTop: 8, alignSelf: "flex-start" },
  replyText: { color: "#0369a1", fontWeight: "700", fontSize: 12 },
  separator: { height: 1, backgroundColor: "#eef2ff", marginVertical: 6 },

  // Sticky composer
  composerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
    backgroundColor: "rgba(247, 251, 255, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "#e6eef6",
  },
  replyPreview: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
  },
  replyPreviewTitle: { fontWeight: "800", color: "#0f172a" },
  replyPreviewBody: { color: "#475569", marginTop: 4 },

  composerBar: { flexDirection: "row", alignItems: "center", gap: 8 as any },
  composerInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6eef6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  composerInput: { flex: 1, minHeight: 20, maxHeight: 120, color: "#0f172a" },
  sendBtn: { backgroundColor: "#0369a1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtnDisabled: { opacity: 0.6 },

  followChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6 as any,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e6f2ff",
  },
  followChipOn: { backgroundColor: "#dbeafe" },
  followChipText: { color: "#475569", fontWeight: "700", fontSize: 12 },
});
