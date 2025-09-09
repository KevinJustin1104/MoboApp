// src/screens/AdminAnnouncementEditScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Announcement, createAnnouncement, getAnnouncementById, updateAnnouncement } from "../services/announcements";
import { Ionicons } from "@expo/vector-icons";

type Params = { id: string | null };

export default function AdminAnnouncementEditScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params as Params;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (id) {
        try {
          const a = await getAnnouncementById(id);
          setTitle(a.title);
          setBody(a.body ?? "");
          if (a.image_url) setImage({ uri: a.image_url, name: "current.jpg", type: "image/jpeg" });
        } catch {
          Alert.alert("Error", "Failed to load announcement.");
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [id]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") { Alert.alert("Permission required", "Please allow photo library access."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setImage({ uri: a.uri, name: a.fileName ?? "image.jpg", type: a.mimeType ?? "image/jpeg" });
    }
  }, []);

  const onSave = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await updateAnnouncement(id, { title, body, image: image?.uri?.startsWith("http") ? null : image || null });
      } else {
        const created = await createAnnouncement({ title, body, image });
        // jump to detail thread after creating
        nav.replace("AnnouncementDetail", { announcementId: created.id });
        return;
      }
      nav.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{id ? "Edit" : "Create"} Announcement</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="Announcement title" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Body</Text>
        <TextInput
          style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
          placeholder="Write the announcement..."
          value={body}
          onChangeText={setBody}
          multiline
        />

        <Text style={styles.label}>Image (optional)</Text>
        {image ? (
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={22} color="#64748b" />
            <Text style={{ color: "#64748b", marginLeft: 8 }}>Choose image</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: "#0ea5e9", marginTop: 10 }]}
          onPress={() => { if (id) nav.navigate("AnnouncementDetail", { announcementId: id }); }}
          disabled={!id}
        >
          <Text style={styles.saveText}>{id ? "View Comments" : "Save first to open comments"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  headerTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  form: { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 12, elevation: 1 },
  label: { color: "#0f172a", fontWeight: "700", marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, backgroundColor: "#f8fafc" },
  imagePicker: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, backgroundColor: "#f8fafc", flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8 },
  preview: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#f1f5f9", marginTop: 8 },
  saveBtn: { backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 16 },
  saveText: { color: "#fff", fontWeight: "800" },
});