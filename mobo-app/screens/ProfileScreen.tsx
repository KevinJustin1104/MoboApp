import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { getProfile, updateProfile, UserProfile } from "../services/profile";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useContext(AuthContext);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setName(data.name);
    } catch (err) {
      console.warn("Failed to fetch profile", err);
      Alert.alert("Error", "Failed to fetch profile.");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const updated = await updateProfile(name);
      setProfile(updated);
      setEditing(false);
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (err) {
      console.warn("Failed to update profile", err);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, justifyContent: "center" }} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => Alert.alert("Help", "Contact LGU for account support.")} style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={22} color="#1e40af" />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarBox}>
        <Image source={{ uri: "https://placehold.co/100x100/1E40AF/ffffff?text=U" }} style={styles.avatar} />
        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => Alert.alert("Change photo", "Photo upload simulated.")}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={name} editable={editing} onChangeText={setName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={profile?.email || ""} editable={false} />

        <View style={styles.actions}>
          {editing ? (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#10b981" }]} onPress={onSave} disabled={saving}>
                <Text style={styles.actionText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ef4444" }]} onPress={() => setEditing(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(true)}>
                <Text style={styles.actionText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ef4444" }]} onPress={() => signOut()}>
                <Text style={styles.actionText}>Logout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#0f172a" },
  helpBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  avatarBox: { alignItems: "center", marginVertical: 12 },
  avatar: { width: 100, height: 100, borderRadius: 18, backgroundColor: "#fff" },
  editAvatarBtn: { position: "absolute", right: 16, bottom: 8, backgroundColor: "#1e40af", padding: 8, borderRadius: 20 },
  form: { backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1 },
  label: { color: "#6b7280", fontSize: 12, marginTop: 8 },
  input: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, marginTop: 6 },
  actions: { flexDirection: "row", marginTop: 14, justifyContent: "space-between" },
  actionBtn: { backgroundColor: "#1e40af", padding: 12, borderRadius: 8, minWidth: 120, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "700" },
});
