// src/screens/AnnouncementDetailScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { getAnnouncementById } from "../services/announcements";

export default function AnnouncementDetailScreen() {
  const route = useRoute<any>();
  const { announcementId } = route.params ?? {};
  const [ann, setAnn] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!announcementId) return;
    setLoading(true);
    try {
      const a = await getAnnouncementById(announcementId);
      setAnn(a);
    } catch (err) {
      console.warn("Failed to load announcement", err);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f6f8fb" }}>
      <View style={{ padding: 12, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ flex: 1, textAlign: "center", fontWeight: "700" }}>Announcement</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : !ann ? (
        <View style={{ padding: 20 }}><Text>No announcement found</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 6 }}>{ann.title}</Text>
          <Text style={{ color: "#9ca3af", marginBottom: 12 }}>{new Date(ann.created_at).toLocaleString()}</Text>
          {ann.image_url ? (
            <Image
              source={{ uri: (ann.image_url.startsWith("http") ? ann.image_url : `http://<YOUR_SERVER_HOST>:8000${ann.image_url}`) }}
              style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 12 }}
              resizeMode="cover"
            />
          ) : null}
          <Text style={{ color: "#374151", lineHeight: 20 }}>{ann.body}</Text>
        </ScrollView>
      )}
    </View>
  );
}
