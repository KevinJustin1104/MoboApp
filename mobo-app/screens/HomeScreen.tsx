// src/screens/HomeScreen.tsx
import React, { useContext, useMemo, useCallback, useState, useEffect } from "react";
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
  AppState,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { getUnreadCount } from "../services/notifications";
import { getLatestAnnouncements, Announcement } from "../services/announcements";
import { getUnreadAlertsCount } from "../services/alert";
import { useTranslation } from "react-i18next";
import { myCurrentAppointment, type Appointment } from "../services/appointments";

const SERVICE_ITEMS = [
  { id: "services", labelKey: "common.services", icon: "construct-outline", route: "BookAppointment" as const },
  { id: "citizen", labelKey: "common.citizenGuide", icon: "people-outline", route: "Announcements" as const },
  { id: "eservices", labelKey: "common.eServices", icon: "globe-outline", route: "BookAppointment" as const },
  { id: "emergency", labelKey: "common.emergency", icon: "warning-outline", route: "Alerts" as const },
  { id: "utilities", labelKey: "common.utilities", icon: "flash-outline", route: "BookAppointment" as const },
  { id: "transport", labelKey: "common.transport", icon: "bus-outline", route: "BookAppointment" as const },
  { id: "business", labelKey: "common.business", icon: "bar-chart-outline", route: "BookAppointment" as const },
  { id: "viewmore", labelKey: "common.viewMore", icon: "add-outline", route: "BookAppointment" as const },
];

function getGreeting(t: (key: string, fallback?: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.goodMorning", "Good morning");
  if (hour < 18) return t("home.goodAfternoon", "Good afternoon");
  return t("home.goodEvening", "Good evening");
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { signOut, userToken } = useContext(AuthContext);
  const { t } = useTranslation();

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [currentAppt, setCurrentAppt] = useState<Appointment | null>(null);

  const fetchCurrentAppt = useCallback(async () => {
    if (!userToken) return;
    try {
      const appt = await myCurrentAppointment();
      setCurrentAppt(appt);
    } catch {
      setCurrentAppt(null);
    }
  }, [userToken]);

  const fetchUnread = useCallback(async () => {
    if (!userToken) return;
    try {
      const count = await getUnreadCount();
      setUnreadNotifCount(count);
    } catch {
      setUnreadNotifCount(0);
    }
  }, [userToken]);

  const fetchAlertsUnread = useCallback(async () => {
    try {
      const n = await getUnreadAlertsCount();
      setUnreadAlerts(n);
    } catch {
      setUnreadAlerts(0);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const list = await getLatestAnnouncements(5);
      setAnnouncements(list);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
      fetchAlertsUnread();
      fetchAnnouncements();
      fetchCurrentAppt();
    }, [fetchUnread, fetchAlertsUnread, fetchAnnouncements, fetchCurrentAppt])
  );

  useEffect(() => {
    if (!userToken) return;
    let stopped = false;
    let timer: any;
    const tick = async () => {
      if (stopped) return;
      try {
        const [notif, alerts, appt] = await Promise.all([
          getUnreadCount().catch(() => 0),
          getUnreadAlertsCount().catch(() => 0),
          myCurrentAppointment().catch(() => null),
        ]);
        if (!stopped) {
          setUnreadNotifCount(notif);
          setUnreadAlerts(alerts);
          setCurrentAppt(appt);
        }
      } catch {}
    };
    const schedule = () => {
      const hidden = typeof document !== "undefined" && (document as any).hidden;
      timer = setTimeout(loop, hidden ? 60_000 : 30_000);
    };
    const loop = async () => {
      await tick();
      if (!stopped) schedule();
    };
    loop();
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      appStateSub?.remove?.();
    };
  }, [userToken]);

  const greeting = useMemo(() => getGreeting(t), [t]);
  const isGuest = !userToken;

  return (
    <View style={styles.screen}>
      {/* Light mode header - lavender/purple tint */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#64748b" />
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              editable={false}
            />
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel={t("common.openNotifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#1e293b" />
            {userToken && unreadNotifCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifCount > 99 ? "99+" : String(unreadNotifCount)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>{greeting}</Text>
        {isGuest ? (
          <TouchableOpacity
            style={styles.createAccountBtn}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.9}
          >
            <Text style={styles.createAccountText}>{t("common.createYourAccount", "Create your account")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#1e293b" />
          </TouchableOpacity>
        ) : (
          <View style={styles.userRow}>
            <Image
              source={{ uri: "https://placehold.co/40x40/7C3AED/ffffff?text=U" }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View>
              <Text style={styles.welcomeText}>{t("home.welcomeBack", "Welcome back")}</Text>
              <Text style={styles.username}>Mobo Resident</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t("common.whatWouldYouLike", "What would you like to do?")}</Text>
        <View style={styles.grid}>
          {SERVICE_ITEMS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(s.route)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(s.labelKey, s.id)}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={s.icon as any} size={24} color="#dc2626" />
                {s.id === "emergency" && unreadAlerts > 0 ? (
                  <View style={styles.smallBadge}>
                    <Text style={styles.smallBadgeText}>{unreadAlerts > 99 ? "99+" : String(unreadAlerts)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.serviceLabel}>{t(s.labelKey, s.id)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isGuest && (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>{t("common.helpImproveCity", "Help us improve our city")}</Text>
            <Text style={styles.helpSub}>{t("common.helpImproveCitySub", "Create an account to report local issues directly to the city.")}</Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.9}
            >
              <Text style={styles.signInBtnText}>{t("common.signIn", "Sign in")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentAppt && (
          <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => navigation.navigate("AppointmentSuccess" as never, { appt: currentAppt } as never)}
            activeOpacity={0.9}
          >
            <View style={styles.bookingIcon}>
              <Ionicons name="qr-code-outline" size={22} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingTitle}>Your current booking</Text>
              <Text style={styles.bookingSub}>
                {new Date(currentAppt.slot_start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t("common.latestUpdates", "Latest Updates")}</Text>
          {loadingAnnouncements ? (
            <View style={[styles.placeholderCard, { alignItems: "center" }]}>
              <ActivityIndicator color="#7c3aed" />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>{t("common.noUpdatesTitle", "No updates yet")}</Text>
              <Text style={styles.placeholderSubtitle}>{t("common.noUpdatesSub", "Once announcements are published, you'll see them here.")}</Text>
            </View>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.announcementCard}
                onPress={() => navigation.navigate("AnnouncementDetail", { announcementId: a.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.announcementTitle} numberOfLines={1}>{a.title}</Text>
                {a.body ? <Text numberOfLines={2} style={styles.announcementBody}>{a.body}</Text> : null}
                <Text style={styles.announcementDate}>{new Date(a.created_at).toLocaleString()}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {userToken && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              AccessibilityInfo.announceForAccessibility("Logging out");
              signOut();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("common.logout")}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>{t("common.logout", "Logout")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncidentReport")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("common.reportIncidentA11y")}
      >
        <Ionicons name="warning" size={22} color="#fff" />
        <Text style={styles.fabText}>{t("common.report", "Report")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "#ede9fe",
  },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 4, fontSize: 15, color: "#1e293b" },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  greeting: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 10 },
  createAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  createAccountText: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10 },
  welcomeText: { fontSize: 12, color: "#64748b" },
  username: { fontSize: 16, fontWeight: "700", color: "#1e293b" },

  content: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  serviceCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  smallBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  smallBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  serviceLabel: { fontSize: 11, fontWeight: "600", color: "#1e293b", textAlign: "center" },

  helpCard: {
    marginTop: 20,
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    padding: 18,
  },
  helpTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 6 },
  helpSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 14 },
  signInBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  signInBtnText: { fontSize: 16, fontWeight: "700", color: "#334155" },

  bookingCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bookingTitle: { fontWeight: "700", color: "#1e293b" },
  bookingSub: { color: "#64748b", marginTop: 2, fontSize: 12 },

  section: { marginTop: 24 },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },
  placeholderCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  placeholderTitle: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  placeholderSubtitle: { fontSize: 13, color: "#64748b", marginTop: 6 },
  announcementCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  announcementTitle: { fontWeight: "700", fontSize: 15, marginBottom: 6, color: "#1e293b" },
  announcementBody: { color: "#64748b", fontSize: 14 },
  announcementDate: { color: "#94a3b8", fontSize: 12, marginTop: 8 },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logoutText: { color: "#dc2626", fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 90,
    backgroundColor: "#dc2626",
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
