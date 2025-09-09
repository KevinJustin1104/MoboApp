import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
  Platform,
  SafeAreaView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../services/api"; // axios instance with baseURL
import { Announcement, getLatestAnnouncements, deleteAnnouncement } from "../services/announcements";

export default function AdminAnnouncementsScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const API_BASE = (client.defaults.baseURL || "").replace(/\/$/, "");
  const resolveImageUri = (a: Announcement) => {
    if ((a as any).image_data_uri) return (a as any).image_data_uri as string; // prefer base64 data URI
    if (a.image_url?.startsWith("http")) return a.image_url;
    if (a.image_url?.startsWith("/")) return `${API_BASE}${a.image_url}`;
    return null;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getLatestAnnouncements(100);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onDelete = (id: string) => {
    Alert.alert("Delete announcement", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAnnouncement(id);
            load();
          } catch (e) {
            Alert.alert("Error", "Failed to delete.");
          }
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.title.toLowerCase().includes(q) || (it.body || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const renderItem = ({ item }: { item: Announcement }) => {
    const imgUri = resolveImageUri(item);
    return (
      <View style={styles.card}>
        {/* Thumbnail */}
        <TouchableOpacity
          style={styles.thumbWrap}
          activeOpacity={0.85}
          onPress={() => nav.navigate("AnnouncementDetail", { announcementId: item.id })}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Open ${item.title}`}
        >
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="megaphone-outline" size={24} color="#4f46e5" />
            </View>
          )}
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.cardBody}
          onPress={() => nav.navigate("AnnouncementDetail", { announcementId: item.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {item.body ? <Text style={styles.snippet} numberOfLines={2}>{item.body}</Text> : null}
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => nav.navigate("AdminAnnouncementEdit", { id: item.id })}
            accessibilityLabel="Edit announcement"
          >
            <Ionicons name="create-outline" size={18} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "#fff1f2" }]}
            onPress={() => onDelete(item.id)}
            accessibilityLabel="Delete announcement"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSub}>Admin</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => nav.navigate("AdminAnnouncementEdit", { id: null })}
            accessibilityLabel="Create announcement"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            placeholder="Search announcements"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-text-outline" size={28} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>No announcements</Text>
                <Text style={styles.emptySub}>Create one using the + button.</Text>
              </View>
            }
          />
        )}

        {/* Floating Create */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => nav.navigate("AdminAnnouncementEdit", { id: null })}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Create announcement"
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Create</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  container: { flex: 1, backgroundColor: "#f6f8fb" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
    paddingBottom: 10,
    gap: 10 as any,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  headerTitle: { fontWeight: "800", fontSize: 18, color: "#0f172a", lineHeight: 22 },
  headerSub: { color: "#64748b", fontSize: 12 },
  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    gap: 8 as any,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  thumbWrap: { width: 64, height: 64, borderRadius: 12, overflow: "hidden" },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#f1f5f9" },
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eef2ff",
  },
  cardBody: { flex: 1, paddingHorizontal: 10 },
  title: { fontWeight: "800", color: "#0f172a", fontSize: 15, marginBottom: 4 },
  snippet: { color: "#475569", fontSize: 13, marginBottom: 6 },
  date: { color: "#94a3b8", fontSize: 11 },

  actions: { justifyContent: "space-between", alignItems: "center", gap: 6 as any },
  iconBtn: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 10,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  empty: { padding: 24, alignItems: "center" },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  emptySub: { color: "#6b7280" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 26,
    backgroundColor: "#2563eb",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    gap: 8 as any,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
