// src/screens/HomeScreen.tsx
import React, { useContext, useMemo, useCallback, useState, useEffect, useRef } from "react";
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
  AppState, // 👈 added
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { RootStackParamList } from "../navigation";
import { getUnreadCount } from "../services/notifications";
import { getLatestAnnouncements, Announcement } from "../services/announcements";
import { getUnreadAlertsCount } from "../services/alert";
import { useTranslation } from "react-i18next";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { signOut } = useContext(AuthContext);
  const { t } = useTranslation();

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadNotifCount(count);
    } catch (err) {
      console.warn("Failed to fetch unread notifications", err);
      setUnreadNotifCount(0);
    }
  }, []);

  const fetchAlertsUnread = useCallback(async () => {
    try {
      const n = await getUnreadAlertsCount();
      setUnreadAlerts(n);
    } catch (e) {
      console.warn("Failed to fetch unread alerts", e);
      setUnreadAlerts(0);
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

  // Existing: refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUnread();
      fetchAlertsUnread();
      fetchAnnouncements();
    }, [fetchUnread, fetchAlertsUnread, fetchAnnouncements])
  );

  // NEW: Live auto-refresh loop (no manual refresh needed)
  useEffect(() => {
    let stopped = false;
    let timer: any;

    const tick = async () => {
      if (stopped) return;
      // Run both requests in parallel
      try {
        const [notif, alerts] = await Promise.all([
          getUnreadCount().catch(() => 0),
          getUnreadAlertsCount().catch(() => 0),
        ]);
        if (!stopped) {
          setUnreadNotifCount(notif);
          setUnreadAlerts(alerts);
        }
      } catch {
        // ignore errors; next loop will try again
      }
    };

    const schedule = () => {
      const hidden = typeof document !== "undefined" && (document as any).hidden;
      const next = hidden ? 60_000 : 30_000; // slow down when backgrounded on web
      timer = setTimeout(loop, next);
    };

    const loop = async () => {
      await tick();
      if (!stopped) schedule();
    };

    // Start immediately
    loop();

    // Refresh when tab gains focus (web)
    const onWindowFocus = () => tick();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onWindowFocus);
    }

    // Refresh when tab visibility changes to visible (web)
    const onVisibility = () => {
      if (typeof document !== "undefined" && !(document as any).hidden) {
        tick();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    // Refresh when app returns to foreground (native)
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onWindowFocus);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      // @ts-ignore RN types: remove() exists on the subscription
      appStateSub?.remove?.();
    };
  }, []);

  const actions = useMemo(
    () => [
      {
        id: "sos",
        label: t("common.sosHotlines"),
        icon: "call" as const,
        onPress: () => navigation.navigate("SOSHotlines" as never),
        color: "#e6f2ff",
      },
      {
        id: "report",
        label: t("common.reportIncident"),
        icon: "warning-outline" as const,
        onPress: () => navigation.navigate("IncidentReport"),
        color: "#ffe8e8",
      },
      {
        id: "alerts",
        label: t("common.realTimeAlerts"),
        icon: "radio-outline" as const,
        onPress: () => navigation.navigate("Alerts" as never),
        color: "#e8fff7",
      },
      {
        id: "notifications",
        label: t("common.notifications"),
        icon: "notifications-outline" as const,
        onPress: () => navigation.navigate("Notifications"),
        color: "#e8f0ff",
      },
      {
        id: "announcements",
        label: t("common.announcements"),
        icon: "megaphone-outline" as const,
        onPress: () => navigation.navigate("Announcements"),
        color: "#e9fbea",
      },
      {
        id: "profile",
        label: t("common.profile"),
        icon: "person-circle-outline" as const,
        onPress: () => navigation.navigate("Profile"),
        color: "#fff7e8",
      },
      {
        id: "settings",
        label: t("common.settings"),
        icon: "settings-outline" as const,
        onPress: () => navigation.navigate("SettingsLanguage" as never),
        color: "#f1f5f9",
      },
    ],
    [navigation, t]
  );

  return (
    <View style={styles.screen}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper} accessible accessibilityLabel="User avatar">
            <Image
              source={{ uri: "https://placehold.co/56x56/1E40AF/ffffff?text=U" }}
              style={styles.avatar}
              resizeMode="cover" // 👈 move resizeMode to prop to avoid RN Web warning
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.greeting}>{t("home.welcomeBack", "Welcome back")}</Text>
            <Text style={styles.username}>Mobo Resident</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel={t("common.openNotifications")}
          >
            <Ionicons name="notifications-outline" size={26} color="#1e40af" />
            {unreadNotifCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifCount > 99 ? "99+" : String(unreadNotifCount)}</Text>
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
                {a.id === "alerts" && unreadAlerts > 0 ? (
                  <View style={styles.smallBadge}>
                    <Text style={styles.smallBadgeText}>{unreadAlerts > 99 ? "99+" : String(unreadAlerts)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("common.latestUpdates")}</Text>

          {loadingAnnouncements ? (
            <View style={[styles.placeholderCard, { alignItems: "center" }]}>
              <ActivityIndicator />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>{t("common.noUpdatesTitle")}</Text>
              <Text style={styles.placeholderSubtitle}>{t("common.noUpdatesSub")}</Text>
            </View>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.placeholderCard, { marginBottom: 10 }]}
                onPress={() => navigation.navigate("AnnouncementDetail", { announcementId: a.id } as any)}
                activeOpacity={0.85}
              >
                <Text style={{ fontWeight: "700", fontSize: 15, marginBottom: 6 }}>{a.title}</Text>
                {a.body ? <Text numberOfLines={2} style={{ color: "#6b7280" }}>{a.body}</Text> : null}
                <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
                  {new Date(a.created_at).toLocaleString()}
                </Text>
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
            accessibilityLabel={t("common.logout")}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>{t("common.logout")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncidentReport")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("common.reportIncidentA11y")}
      >
        <Ionicons name="warning" size={22} color="#fff" />
        <Text style={styles.fabText}>{t("common.report")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  // You can remove resizeMode here to silence RN Web warning
  avatar: { width: 56, height: 56 /*, resizeMode: "cover"*/ },
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
  smallBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  smallBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

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
