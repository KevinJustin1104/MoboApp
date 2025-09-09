// src/screens/AnnouncementDetailScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Announcement, getAnnouncementById, getAnnouncementComments, AnnouncementComment, postAnnouncementComment } from "../services/announcements";

type Params = { announcementId: string };

export default function AnnouncementDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { announcementId } = route.params as Params;

  const [item, setItem] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<AnnouncementComment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        getAnnouncementById(announcementId),
        getAnnouncementComments(announcementId),
      ]);
      setItem(a);
      setComments(c);
    } catch (e) {
      console.warn("Failed to load announcement", e);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => { load(); }, [load]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await postAnnouncementComment(announcementId, trimmed, replyTo?.id);
      const c = await getAnnouncementComments(announcementId);
      setComments(c);
      setText("");
      setReplyTo(null);
    } catch (e) {
      console.warn("send comment failed", e);
    } finally {
      setSending(false);
    }
  };

  const renderComment = (c: AnnouncementComment, depth = 0) => (
    <View key={c.id} style={[styles.commentBox, { marginLeft: depth * 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
  <Ionicons name="person-circle-outline" size={18} color="#475569" />
  <Text style={{ marginLeft: 6, fontWeight: "700", color: "#0f172a" }}>
    {c.author_name || "User"}   {/* NEW: show real name */}
  </Text>
  <Text style={{ marginLeft: 8, color: "#94a3b8", fontSize: 12 }}>
    {new Date(c.created_at).toLocaleString()}
  </Text>
</View>

      <Text style={{ color: "#0f172a" }}>{c.comment}</Text>
      <View style={{ flexDirection: "row", gap: 12 as any, marginTop: 6 }}>
        <TouchableOpacity onPress={() => setReplyTo(c)}>
          <Text style={{ color: "#2563eb", fontWeight: "700" }}>Reply</Text>
        </TouchableOpacity>
      </View>
      {c.replies?.map((r) => renderComment(r, depth + 1))}
    </View>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  if (!item) return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <Text>Announcement not found.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f6f8fb" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Announcement</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={[item]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={() => (
          <View style={styles.card}>
           {item.image_data_uri ? (
  <Image source={{ uri: item.image_data_uri }} resizeMode="cover" style={styles.image} />
) : item.image_url ? (
  <Image source={{ uri: item.image_url }} resizeMode="cover" style={styles.image} />
) : null}

            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}

            <Text style={styles.commentsTitle}>Comments</Text>
            <View style={{ marginTop: 6 }}>
              {comments.length === 0 ? (
                <Text style={{ color: "#94a3b8" }}>Be the first to comment.</Text>
              ) : (
                comments.map((c) => renderComment(c))
              )}
            </View>
          </View>
        )}
      />

      {/* Composer */}
      <View style={styles.composer}>
        {replyTo ? (
          <View style={styles.replyBar}>
            <Text numberOfLines={1} style={{ color: "#1e293b", flex: 1 }}>
              Replying to: {replyTo.comment}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending || !text.trim()}>
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: Platform.OS === "ios" ? 12 : 8, marginBottom: 8, backgroundColor: "#f6f8fb" },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#0f172a" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, elevation: 1 },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10, backgroundColor: "#f1f5f9" },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  body: { color: "#334155", marginBottom: 12 },
  commentsTitle: { fontWeight: "800", color: "#0f172a", marginTop: 8 },

  commentBox: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0" },

  composer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  replyBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#eef2ff", padding: 6, borderRadius: 8, marginBottom: 8, gap: 8 as any },
  inputRow: { flexDirection: "row", gap: 8 as any },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  sendBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
});