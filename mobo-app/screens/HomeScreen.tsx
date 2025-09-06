// src/screens/HomeScreen.tsx
import React, { useContext, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  AccessibilityInfo,
  ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { RootStackParamList } from "../navigation";
import { getUnreadCount } from "../services/notifications";
import { getLatestAnnouncements, Announcement } from "../services/announcements";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { userToken, signOut } = useContext(AuthContext);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.warn("Failed to fetch unread count", err);
      setUnreadCount(0);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const list = await getLatestAnnouncements(5);
      setAnnouncements(list);
    } catch (err) {
      console.warn("Failed to fetch announcements", err);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  // refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchUnread();
      fetchAnnouncements();
    }, [fetchUnread, fetchAnnouncements])
  );

  const actions = useMemo(
    () => [
      {
        id: "report",
        label: "Report Incident",
        icon: "warning-outline" as const,
        onPress: () => navigation.navigate("IncidentReport"),
        color: "#ffe8e8",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: "notifications-outline" as const,
        onPress: () => navigation.navigate("Notifications"),
        color: "#e8f0ff",
      },
      {
        id: "announcements",
        label: "Announcements",
        icon: "megaphone-outline" as const,
        onPress: () => navigation.navigate("Announcements"),
        color: "#e9fbea",
      },
      {
        id: "profile",
        label: "Profile",
        icon: "person-circle-outline" as const,
        onPress: () => navigation.navigate("Profile"),
        color: "#fff7e8",
      },
    ],
    [navigation]
  );

  return (
    <View style={styles.screen}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper} accessible accessibilityLabel="User avatar">
            <Image
              source={{
                uri: "https://placehold.co/56x56/1E40AF/ffffff?text=U",
              }}
              style={styles.avatar}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.username}>Mobo Resident</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={26} color="#1e40af" />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Mobo Citizen Services</Text>
        <Text style={styles.bannerSubtitle}>Quick access to local services and reporting tools</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.card, { backgroundColor: a.color }]}
              onPress={a.onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={a.icon} size={26} color="#1e40af" />
              </View>
              <Text style={styles.cardLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Updates</Text>

          {loadingAnnouncements ? (
            <View style={[styles.placeholderCard, { alignItems: "center" }]}>
              <ActivityIndicator />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>No updates yet</Text>
              <Text style={styles.placeholderSubtitle}>
                Once announcements are published, you'll see them here.
              </Text>
            </View>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.placeholderCard, { marginBottom: 10 }]}
                onPress={() => navigation.navigate("AnnouncementDetail", { announcementId: a.id })}
                activeOpacity={0.85}
              >
                <Text style={{ fontWeight: "700", fontSize: 15, marginBottom: 6 }}>{a.title}</Text>
                {a.body ? <Text numberOfLines={2} style={{ color: "#6b7280" }}>{a.body}</Text> : null}
                <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>{new Date(a.created_at).toLocaleString()}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.logoutButton]}
            onPress={() => {
              AccessibilityInfo.announceForAccessibility("Logging out");
              signOut();
            }}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncidentReport")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Report an incident"
      >
        <Ionicons name="warning" size={22} color="#fff" />
        <Text style={styles.fabText}>Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  /* (same style definitions as you already have) */
  screen: { flex: 1, backgroundColor: "#f6f8fb" },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6edf9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 56, height: 56, resizeMode: "cover" },
  greeting: { fontSize: 12, color: "#6b7280" },
  username: { fontSize: 16, color: "#0f172a", fontWeight: "600" },

  headerRight: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  bannerTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  bannerSubtitle: { color: "#6b7280", fontSize: 13 },

  content: { paddingHorizontal: 16, paddingBottom: 120 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12 as any,
    marginTop: 12,
  },
  card: {
    width: "48%",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 100,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },

  section: { marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  placeholderCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  placeholderTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  placeholderSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 6 },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  logoutText: { color: "#dc2626", marginLeft: 10, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 26,
    backgroundColor: "#ef4444",
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
});
