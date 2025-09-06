// src/screens/AdminAnnouncementsScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type Announcement = { id: string; title: string; body: string; imageUri?: string };

type NavProp = NativeStackNavigationProp<RootStackParamList, "AdminAnnouncements">;

export default function AdminAnnouncementsScreen() {
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<Announcement[]>(
    Array.from({ length: 30 }).map((_, i) => ({ id: `A${i + 1}`, title: `Announcement ${i + 1}`, body: `This is announcement ${i + 1}` }))
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please grant photo access to add an image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: false });
    if (!res.canceled) {
      setImageUri(res.assets?.[0].uri);
    }
  };

  const addAnnouncement = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Validation", "Title and body are required.");
      return;
    }
    setPosting(true);
    // TODO: upload image + post to backend
    setTimeout(() => {
      const newItem: Announcement = { id: `A${Date.now()}`, title: title.trim(), body: body.trim(), imageUri };
      setItems(prev => [newItem, ...prev]);
      setTitle(""); setBody(""); setImageUri(undefined);
      setPosting(false);
    }, 700);
  };

  const remove = (id: string) => {
    // TODO: backend delete
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      // simulate refresh
      setItems(prev => prev.slice(0, 30));
      setRefreshing(false);
    }, 700);
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.annCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.annTitle}>{item.title}</Text>
        <Text style={styles.annBody}>{item.body}</Text>
        {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.annImage} /> : null}
      </View>
      <TouchableOpacity style={styles.trash} onPress={() => remove(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Announcements</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.form}>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput placeholder="Body" value={body} onChangeText={setBody} style={[styles.input, { height: 80 }]} multiline />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={18} color="#0369a1" />
            <Text style={{ marginLeft: 8, color: "#0369a1", fontWeight: "700" }}>{imageUri ? "Change image" : "Add image"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addBtn, { marginLeft: 8 }]} onPress={addAnnouncement} disabled={posting}>
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Post</Text>}
          </TouchableOpacity>
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 18, paddingBottom: 90 }}
        initialNumToRender={10}
        windowSize={10}
        onEndReached={() => {
          // simulate loading more
          setItems(prev => [...prev, ...Array.from({ length: 20 }).map((_, i) => ({ id: `A-more-${prev.length + i}`, title: `Older ${prev.length + i}`, body: "older announcement" }))]);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={() => <ActivityIndicator style={{ margin: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", padding: 18 },
  back: { flexDirection: "row", alignItems: "center", width: 90 },
  backText: { marginLeft: 6, color: "#0f172a" },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#0f172a" },

  form: { paddingHorizontal: 18, marginBottom: 12 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#e6eef6", marginBottom: 8 },
  imageBtn: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: "#eef2f6" },
  addBtn: { backgroundColor: "#0369a1", padding: 10, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700" },

  preview: { marginTop: 10, width: "100%", height: 180, borderRadius: 10 },

  annCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "flex-start" },
  annTitle: { fontWeight: "700", fontSize: 15, color: "#0f172a" },
  annBody: { color: "#64748b", marginTop: 6 },
  annImage: { marginTop: 8, width: 120, height: 80, borderRadius: 8 },
  trash: { padding: 8 },
});
