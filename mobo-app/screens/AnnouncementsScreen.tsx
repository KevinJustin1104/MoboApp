// src/screens/AnnouncementsScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getLatestAnnouncements, Announcement } from "../services/announcements";

export default function AnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Announcement[]>([]);
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

  useFocusEffect(useCallback(() => { fetchAnnouncements(); }, [fetchAnnouncements]));

  const onRefresh = () => { setRefreshing(true); fetchAnnouncements(); };

  const filtered = items.filter(
    (it) =>
      it.title.toLowerCase().includes(query.toLowerCase()) ||
      (it.body && it.body.toLowerCase().includes(query.toLowerCase()))
  );

  const renderCard = ({ item }: { item: Announcement }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("AnnouncementDetail", { announcementId: item.id })}
      style={styles.card}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} resizeMode="cover" style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { justifyContent: "center", alignItems: "center", backgroundColor: "#eef2ff" }]}>
          <Ionicons name="megaphone-outline" size={32} color="#4f46e5" />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.body ? <Text style={styles.cardSnippet} numberOfLines={2}>{item.body}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString()}</Text>
          <View style={styles.viewCTA}>
            <Text style={styles.viewCTAText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563eb" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
          returnKeyType="search"
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
          renderItem={renderCard}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: Platform.OS === "ios" ? 12 : 8, marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#0f172a" },

  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 12, padding: 10, borderRadius: 10, elevation: 1, gap: 8 as any },
  searchInput: { flex: 1 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  cardImage: { width: "100%", height: 160, backgroundColor: "#f1f5f9" },
  cardBody: { padding: 12 },
  cardTitle: { fontWeight: "800", color: "#0f172a", fontSize: 16, marginBottom: 6 },
  cardSnippet: { color: "#475569", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { color: "#94a3b8", fontSize: 12 },
  viewCTA: { flexDirection: "row", alignItems: "center" },
  viewCTAText: { color: "#2563eb", fontWeight: "700", marginRight: 4 },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: "#6b7280" },
});
