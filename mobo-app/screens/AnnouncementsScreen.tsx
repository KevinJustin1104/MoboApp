// src/screens/AnnouncementsScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getLatestAnnouncements, Announcement } from "../services/announcements";

export default function AnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getLatestAnnouncements(20);
      setItems(list);
    } catch (err) {
      console.warn("Failed to fetch announcements", err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements().catch((e) => console.warn(e));
    }, [fetchAnnouncements])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const filtered = items.filter(
    (it) =>
      it.title.toLowerCase().includes(query.toLowerCase()) ||
      (it.body && it.body.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput
          placeholder="Search announcements"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const isOpen = !!expanded[item.id];
            return (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.snippet} numberOfLines={isOpen ? 0 : 2}>
                  {item.body}
                </Text>
                <TouchableOpacity onPress={() => toggle(item.id)} style={styles.readMore}>
                  <Text style={styles.readMoreText}>{isOpen ? "Show less" : "Read more"}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No announcements found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8, paddingHorizontal: 12, paddingTop: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#0f172a" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 12, padding: 10, borderRadius: 10, elevation: 1 },
  searchInput: { marginLeft: 8, flex: 1 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 12, elevation: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  title: { fontWeight: "700", color: "#0f172a" },
  date: { color: "#9ca3af", fontSize: 12 },
  snippet: { color: "#6b7280", marginBottom: 8 },
  readMore: { alignSelf: "flex-start" },
  readMoreText: { color: "#1e40af", fontWeight: "700" },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: "#6b7280" },
});
