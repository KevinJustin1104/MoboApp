import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  SafeAreaView,
  Modal,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { getDepartments, createDepartment, Department } from "../services/department";

export default function AdminDepartmentsScreen() {
  const navigation = useNavigation();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // search & ui
  const [search, setSearch] = useState("");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<Department | null>(null);

  // add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data ?? []);
    } catch (err) {
      console.warn("Failed to fetch departments", err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDepartments();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert("Validation", "Please enter a department name.");
      return;
    }
    setSubmitting(true);
    try {
      await createDepartment(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setAddModalVisible(false);
      Alert.alert("Success", "Department created!");
      await fetchDepartments();
    } catch (err: any) {
      console.warn("createDepartment error", err);
      Alert.alert("Error", err?.response?.data?.detail || "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
    );
  }, [departments, search]);

  const openDetail = (dept: Department) => {
    setDetailItem(dept);
    setDetailModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0369a1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Departments</Text>

        <TouchableOpacity onPress={onRefresh} style={styles.headerRight}>
          <Ionicons name="refresh" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search departments"
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

      {/* List */}
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyListContainer : undefined}
        renderItem={({ item }) => (
          <Pressable
            android_ripple={{ color: "#e6eef6" }}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => openDetail(item)}
          >
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : (
                  <Text style={styles.cardSubtitleMuted}>No description</Text>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No departments found</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first department.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
        accessibilityLabel="Add department"
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Department Modal */}
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Department</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ padding: 16, flex: 1 }}
          >
            <Text style={styles.label}>Department name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Municipal Health Office"
              value={newName}
              onChangeText={setNewName}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Description (optional)</Text>
            <TextInput
              style={[styles.formInput, { height: 120, textAlignVertical: "top" }]}
              placeholder="Short description or responsibilities"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.submitBtn, (!newName.trim() || submitting) && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={!newName.trim() || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Department</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="fade" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{detailItem?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailSmall}>{detailItem?.description ?? "No description provided."}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */

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
  searchInput: { marginLeft: 8, flex: 1, height: "100%" },
  clearBtn: { padding: 6 },

  list: { flex: 1, marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  cardPressed: { opacity: 0.9 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "800", color: "#0369a1" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  cardSubtitle: { fontSize: 13, color: "#64748b", marginTop: 6 },
  cardSubtitleMuted: { fontSize: 13, color: "#c1c8d1", marginTop: 6 },

  emptyListContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", justifyContent: "center", marginTop: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#475569" },
  emptySubtitle: { marginTop: 6, color: "#94a3b8" },

  /* FAB */
  fab: {
    position: "absolute",
    right: 18,
    bottom: 28,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0369a1",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },

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
  modalTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: "#0f172a" },

  label: { color: "#475569", fontSize: 12, marginBottom: 8, marginTop: 6 },
  formInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6eef6",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  submitBtn: {
    backgroundColor: "#0369a1",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "800" },

  /* detail modal */
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  detailCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  detailLabel: { marginTop: 12, fontSize: 12, color: "#475569" },
  detailSmall: { color: "#475569", fontSize: 14 },
});
