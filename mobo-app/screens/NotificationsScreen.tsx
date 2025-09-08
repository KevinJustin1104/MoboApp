// src/screens/NotificationsScreen.tsx
import React, { useCallback, useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { listNotifications, markNotificationRead } from "../services/notifications.api";

type Notification = {
  id: string;
  message?: string | null;
  incident_id?: string | null;
  created_at: string;
  read: boolean;
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { userToken } = useContext(AuthContext);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null); // id being marked

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listNotifications();
      // convert to local type if backend property names differ
      const mapped = items.map((it) => ({
        id: it.id,
        message: it.message ?? "",
        incident_id: it.incident_id ?? null,
        created_at: it.created_at,
        read: !!it.read,
      }));
      setNotifications(mapped);
    } catch (err) {
      console.warn("Failed to load notifications", err);
      Alert.alert("Error", "Unable to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };


    const handleOpenNotification = async (item: Notification) => {
    try {
        if (!item.read) {
        setMarking(item.id);
        const updated = await markNotificationRead(item.id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: !!updated.read } : n))
        );
        }
    } catch (err) {
        console.warn("Failed to mark read", err);
    } finally {
        setMarking(null);
        // prefer to navigate with incidentId if backend included it
        const targetIncidentId = (item as any).incident_id ?? null;
        if (targetIncidentId) {
        navigation.navigate("IncidentStatus", { incidentId: targetIncidentId });
        } else {
        // fallback - navigate with notification id
        navigation.navigate("IncidentStatus", { notificationId: item.id });
        }
    }
    };

  const clearAll = () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) {
      Alert.alert("No unread", "All notifications are already read.");
      return;
    }
    Alert.alert(
      "Mark all read",
      `Mark ${unread.length} notification(s) as read?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "OK",
          onPress: async () => {
            try {
              // optimistic update locally first for snappy UI
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              // then call API for each unread
              await Promise.all(unread.map((u) => markNotificationRead(u.id).catch((e) => {
                console.warn("mark read failed for", u.id, e);
                // we don't revert local state, but you can if desired
              })));
              // refetch to ensure state in sync
              fetchNotifications();
            } catch (err) {
              console.warn("Clear all error", err);
              Alert.alert("Error", "Failed to mark all as read");
              // refetch to ensure accurate state
              fetchNotifications();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.unread]}
      onPress={() => handleOpenNotification(item)}
      activeOpacity={0.85}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={item.read ? "notifications-outline" : "notifications"} size={22} color="#1e40af" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={2}>
          {item.message ?? "Notification"}
        </Text>
        <Text style={styles.rowText} numberOfLines={2}>
          {item.incident_id ? `Incident: ${item.incident_id}` : ""}
        </Text>
        <Text style={styles.rowTime}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>

      {/* small spinner when marking this item */}
      {marking === item.id ? (
        <ActivityIndicator size="small" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={clearAll} style={styles.headerAction}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={notifications.length ? undefined : styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={56} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You will see alerts and updates here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb", padding: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#0f172a" },
  headerAction: { width: 36, justifyContent: "center", alignItems: "center" },

  row: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 10, alignItems: "center", elevation: 1 },
  unread: { borderWidth: 1, borderColor: "#e6f0ff", backgroundColor: "#f8fbff" },
  rowLeft: { marginRight: 12 },
  rowBody: { flex: 1 },
  rowTitle: { fontWeight: "600", fontSize: 14, color: "#0f172a" },
  rowTitleUnread: { color: "#0f172a" },
  rowText: { color: "#6b7280", marginTop: 4 },
  rowTime: { color: "#9ca3af", fontSize: 11, marginTop: 8 },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyBox: { justifyContent: "center", alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "700", color: "#0f172a" },
  emptySubtitle: { color: "#6b7280", marginTop: 6, textAlign: "center" },
});
