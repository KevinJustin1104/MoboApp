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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { getProfile, updateProfile, UserProfile } from "../services/profile";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut, userToken } = useContext(AuthContext);
  const { t } = useTranslation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [userToken]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setName(data.name);
    } catch (err) {
      console.warn("Failed to fetch profile", err);
      setProfile(null);
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

  // Guest state: show sign-in / create account prompt
  if (!userToken) {
    return (
      <View style={styles.container}>
        <View style={styles.guestHeader}>
          <Text style={styles.guestTitle}>{t("common.account", "Account")}</Text>
        </View>
        <View style={styles.guestContent}>
          <View style={styles.guestIconWrap}>
            <Ionicons name="person-circle-outline" size={80} color="#94a3b8" />
          </View>
          <Text style={styles.guestMessage}>
            {t("common.helpImproveCitySub", "Create an account to report local issues directly to the city.")}
          </Text>
          <TouchableOpacity
            style={styles.guestSignInBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.guestSignInText}>{t("common.signIn", "Sign in")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestCreateBtn}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.guestCreateText}>{t("common.createYourAccount", "Create your account")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1, justifyContent: "center" }} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>{t("common.profile", "Profile")}</Text>
        <TouchableOpacity onPress={() => Alert.alert("Help", "Contact LGU for account support.")} style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={22} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarBox}>
        <Image source={{ uri: "https://placehold.co/100x100/7C3AED/ffffff?text=U" }} style={styles.avatar} />
        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => Alert.alert("Change photo", "Photo upload simulated.")}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

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
                <Text style={styles.actionText}>{t("common.logout", "Logout")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#1e293b" },
  helpBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  avatarBox: { alignItems: "center", marginVertical: 12 },
  avatar: { width: 100, height: 100, borderRadius: 18, backgroundColor: "#fff" },
  editAvatarBtn: { position: "absolute", right: 16, bottom: 8, backgroundColor: "#7c3aed", padding: 8, borderRadius: 20 },
  form: { backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  label: { color: "#64748b", fontSize: 12, marginTop: 8 },
  input: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, marginTop: 6 },
  actions: { flexDirection: "row", marginTop: 14, justifyContent: "space-between" },
  actionBtn: { backgroundColor: "#7c3aed", padding: 12, borderRadius: 8, minWidth: 120, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "700" },

  /* Guest state */
  guestHeader: { paddingTop: 48, paddingBottom: 16 },
  guestTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b", textAlign: "center" },
  guestContent: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  guestIconWrap: { marginBottom: 24 },
  guestMessage: { fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  guestSignInBtn: {
    backgroundColor: "#1e293b",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  guestSignInText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  guestCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  guestCreateText: { color: "#7c3aed", fontWeight: "600", fontSize: 15 },
});
