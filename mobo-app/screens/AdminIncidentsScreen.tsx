import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { Admin } from "../services/incidents";
import IncidentDetailModal from "./AdminIncidentDetailScreen";
import { getDepartments, Department } from "../services/department"; // <-- import API

export type Incident = {
  id: string;
  title: string;
  type: string;
  address: string;
  reportedAt: string | null;
  description?: string | null;
  photos?: string[];
  status: "Submitted" | "Acknowledged" | "In Progress" | "Resolved";
  reporterName?: string | null;
  reporterPhone?: string | null;
  reporter_id?: string | null;
  department?: number; // <-- store department id
  department_name?: string;
};

type NavProp = NativeStackNavigationProp<RootStackParamList, "AdminIncidents">;

const PAGE_SIZE = 25;

export default function AdminIncidentsScreen() {
  const navigation = useNavigation<NavProp>();

  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Incident | null>(null);
  const [comment, setComment] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const deps = await getDepartments();
      setDepartments(deps);
    } catch (err: any) {
      console.warn("fetchDepartments error:", err);
      Alert.alert("Failed", err?.message || "Failed to load departments");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setInitialLoading(true);
    try {
      const items: any[] = await Admin.getAllIncidents();
      const normalized: Incident[] = (items || []).map((d: any) => ({
        id: String(d.id),
        title: d.title ?? "",
        type: d.type_name ?? d.type ?? "",
        address: d.address ?? "",
        reportedAt: d.reportedAt ?? d.created_at ?? null,
        description: d.description ?? null,
        photos: d.photos ?? [],
        status: (d.status as Incident["status"]) ?? "Submitted",
        reporterName: d.reporterName ?? d.reporter_name ?? null,
        reporterPhone: d.reporterPhone ?? d.reporter_phone ?? null,
        reporter_id: d.reporter_id ?? null,
        department: d.department,
        department_name: d.department_name,
      }));
      setAllIncidents(normalized);
      setPage(1);
    } catch (err: any) {
      console.warn("fetchAll error:", err);
      Alert.alert("Error", err?.message || "Failed to load incidents");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchAll();
  }, [fetchAll, fetchDepartments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIncidents.filter((i) => {
      const matchesQ =
        q === "" ||
        i.title.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.address.toLowerCase().includes(q) ||
        (i.reporterName ?? "").toLowerCase().includes(q);
      return matchesQ;
    });
  }, [allIncidents, search]);

  const visible = useMemo(() => {
    const sliceEnd = page * PAGE_SIZE;
    return filtered.slice(0, sliceEnd);
  }, [filtered, page]);

  const loadMore = () => {
    if (loadingMore) return;
    if (visible.length >= filtered.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setLoadingMore(false);
    }, 220);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const openDetail = async (item: Incident) => {
    setComment("");
    const cached = allIncidents.find((i) => i.id === item.id) ?? item;
    setSelected(cached);
  };

  const updateStatusWithComment = async (newStatus: Incident["status"], departmentId?: number | null) => {
    if (!selected) return;
    if (!comment.trim()) {
      Alert.alert("Comment required", "Please add a comment before updating status.");
      return;
    }
    setStatusUpdating(true);
    try {
      const result: any = await Admin.updateIncidentStatus(selected.id, newStatus, comment, departmentId);
      const updatedStatus = result.status ?? newStatus;
      const updatedDepartment = result.department ?? departmentId;
      setAllIncidents((prev) =>
        prev.map((i) =>
          i.id === selected.id ? { ...i, status: updatedStatus, department: updatedDepartment } : i
        )
      );
      setSelected((prev) =>
        prev ? { ...prev, status: updatedStatus, department: updatedDepartment } : prev
      );
      setComment("");
      Alert.alert("Updated", `Status updated to "${updatedStatus}"`);
    } catch (err: any) {
      console.warn("updateStatus error:", err);
      Alert.alert("Failed", err?.message || "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7fbff" />

      {/* ---------- HEADER WITH BACK BUTTON ---------- */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incidents</Text>
        <View style={styles.headerRight} />
      </View>

      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0369a1" />
        </View>
      ) : (
        <IncidentsList
          visible={visible}
          search={search}
          setSearch={setSearch}
          onOpen={openDetail}
          onRefresh={onRefresh}
          refreshing={refreshing}
          loadMore={loadMore}
          loadingMore={loadingMore}
        />
      )}

      {/* Detail modal */}
      <IncidentDetailModal
        visible={!!selected}
        selected={selected}
        comment={comment}
        setComment={setComment}
        onClose={() => setSelected(null)}
        onUpdateStatus={updateStatusWithComment}
        statusUpdating={statusUpdating}
        departments={departments}
      />
    </View>
  );
}

// ---------------- IncidentsList ----------------
function IncidentsList({
  visible,
  search,
  setSearch,
  onOpen,
  onRefresh,
  refreshing,
  loadMore,
  loadingMore,
}: {
  visible: Incident[];
  search: string;
  setSearch: (v: string) => void;
  onOpen: (item: Incident) => void;
  onRefresh: () => void;
  refreshing: boolean;
  loadMore: () => void;
  loadingMore: boolean;
}) {
  const renderItem = ({ item }: { item: Incident }) => {
    const getTypeIcon = (type?: string | null) => {
      if (!type || typeof type !== "string") {
        return { name: "alert-circle-outline", color: "#64748b" };
      }
      const t = type.toLowerCase();
      if (t.includes("theft") || t.includes("robbery")) return { name: "wallet-outline", color: "#f97316" };
      if (t.includes("assault")) return { name: "people-outline", color: "#ef4444" };
      if (t.includes("domestic") || t.includes("abuse")) return { name: "people-circle-outline", color: "#ef4444" };
      if (t.includes("fire") || t.includes("burn")) return { name: "flame-outline", color: "#ef4444" };
      if (t.includes("road") || t.includes("accident")) return { name: "car-outline", color: "#f59e0b" };
      return { name: "alert-circle-outline", color: "#64748b" };
    };
    const icon = getTypeIcon(item.type);
    return (
      <Pressable
        android_ripple={{ color: "#eef6ff" }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onOpen(item)}
      >
        <View style={styles.row}>
          <View style={styles.leftIconWrap}>
            <View style={[styles.leftIconCircle, { backgroundColor: (icon.color ?? "#0369a1") + "22" }]}>
              <Ionicons name={icon.name as any} size={18} color={icon.color ?? "#0369a1"} />
            </View>
          </View>

          <View style={styles.middle}>
            <Text style={styles.incTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Text style={styles.smallMeta} numberOfLines={1} ellipsizeMode="tail">
              {item.type} • {item.address}
            </Text>
            <Text style={styles.smallMeta} numberOfLines={1} ellipsizeMode="tail">
              Reported: {item.reportedAt ? new Date(item.reportedAt).toLocaleString() : "—"}
            </Text>
          </View>

          <View style={styles.right}>
            <View style={[styles.badgeSmall, item.status === "Resolved" ? styles.badgeResolved : styles.badgeActive]}>
              <Text style={styles.badgeSmallText}>{item.status}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ marginTop: 8 }} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, type, address, reporter"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={() => (loadingMore ? <ActivityIndicator style={{ margin: 12 }} /> : null)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={12}
        windowSize={11}
        maxToRenderPerBatch={20}
        removeClippedSubviews={true}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="alert-circle" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No incidents found</Text>
            <Text style={styles.emptySubtitle}>Pull to refresh or tap refresh.</Text>
          </View>
        )}
      />
    </>
  );
}

/* ---------- Styles (shared) ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7fbff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e6eef6",
  },
  headerLeft: { padding: 6 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerRight: { width: 36, alignItems: "flex-end" },

  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#e6eef6",
  },
  searchInput: { marginLeft: 8, flex: 1, height: "100%", fontSize: 14 },
  clearBtn: { padding: 6 },

  list: { flex: 1, marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginHorizontal: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPressed: { opacity: 0.95 },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftIconWrap: { width: 56, alignItems: "center", justifyContent: "center" },
  leftIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  middle: { flex: 1, paddingRight: 8 },
  incTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  smallMeta: { color: "#64748b", marginTop: 6, fontSize: 12 },

  right: { width: 88, alignItems: "flex-end", justifyContent: "center" },

  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 68,
    alignItems: "center",
  },
  badgeSmallText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  badgeResolved: {
    backgroundColor: "#22c55e",
  },
  badgeActive: {
    backgroundColor: "#f97316",
  },

  empty: { alignItems: "center", justifyContent: "center", marginTop: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#475569" },
  emptySubtitle: { marginTop: 6, color: "#94a3b8" },

  /* modal */
  modalScreen: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e6eef6",
  },
  modalTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  sectionTitle: { marginTop: 12, color: "#0f172a", fontWeight: "700", fontSize: 14 },
  sectionText: { marginTop: 6, color: "#475569", lineHeight: 20, fontSize: 14 },
  photoCard: {
    width: 220,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: "100%", height: "100%" },

  sectionTitleSmall: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },

  commentInput: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6eef6",
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    marginTop: 6,
  },

  actionBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontWeight: "700" },
});
