// src/screens/AdminCategoryIncidentsScreen.tsx
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
  RefreshControl,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import {
  getIncidentCategories,
  createIncidentCategory,
  updateIncidentCategory,
  deleteIncidentCategory,
  IncidentCategory,
} from "../services/incidentsCategory";
import { getDepartments, Department } from "../services/department";

export default function AdminCategoryIncidentsScreen() {
  const navigation = useNavigation();

  // data
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null); // used for filter and create (legacy)
  const [urgencyFilter, setUrgencyFilter] = useState<number | null>(null); // null = All

  // modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptModalTarget, setDeptModalTarget] = useState<"filter" | "create" | "edit">("filter");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<IncidentCategory | null>(null);

  // create form
  const [newName, setNewName] = useState("");
  const [newUrgency, setNewUrgency] = useState<number | null>(2); // default medium
  const [formSubmitting, setFormSubmitting] = useState(false);

  // edit form
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<IncidentCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrgency, setEditUrgency] = useState<number | null>(2);
  const [editDeptId, setEditDeptId] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // fetch
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, depts] = await Promise.all([getIncidentCategories(), getDepartments()]);
      setCategories(cats ?? []);
      setDepartments(depts ?? []);
    } catch (err) {
      console.warn("fetchData error", err);
      setCategories([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- Create ---------------- */
  const openAddModal = () => {
    setNewName("");
    setNewUrgency(2);
    // keep selectedDeptId (legacy) as preselected dept if any
    setFormSubmitting(false);
    setAddModalVisible(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("Validation", "Please enter a category name.");
      return;
    }
    setFormSubmitting(true);
    try {
      // department payload: backend earlier expected string or null; we send number or null
      const deptPayload = selectedDeptId !== null ? String(selectedDeptId) : null;
      await createIncidentCategory(newName.trim(), deptPayload, newUrgency ?? null);
      setNewName("");
      setSelectedDeptId(null);
      setAddModalVisible(false);
      Alert.alert("Success", "Incident category created!");
      await fetchData();
    } catch (err: any) {
      console.warn("createIncidentCategory error", err);
      Alert.alert("Error", err?.response?.data?.detail || "Failed to create category");
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ---------------- Edit ---------------- */
  const openEdit = (item: IncidentCategory) => {
    setEditItem(item);
    setEditName(item.name);
    setEditUrgency(item.urgency_level ?? 2);
    setEditDeptId(item.department_id ?? null);
    setEditSubmitting(false);
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Please enter a category name.");
      return;
    }
    setEditSubmitting(true);
    try {
      const payload = {
        name: editName.trim(),
        department_id: editDeptId ?? null,
        urgency_level: editUrgency ?? null,
      };
      await updateIncidentCategory(editItem.id, payload);
      setEditModalVisible(false);
      setEditItem(null);
      await fetchData();
      Alert.alert("Success", "Category updated");
    } catch (err: any) {
      console.warn("updateIncidentCategory error", err);
      Alert.alert("Error", err?.response?.data?.detail || "Failed to update category");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Confirm delete", "Are you sure you want to delete this category?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteIncidentCategory(id);
            await fetchData();
            Alert.alert("Deleted", "Category removed");
          } catch (err: any) {
            console.warn("deleteIncidentCategory error", err);
            Alert.alert("Error", "Failed to delete category");
          }
        },
      },
    ]);
  };

  /* --------------- Filtering --------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesQ =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        (c.department_name ?? "").toLowerCase().includes(q);
      const matchesDept = selectedDeptId === null || c.department_id === selectedDeptId;
      const matchesUrgency = urgencyFilter === null || (c.urgency_level ?? null) === urgencyFilter;
      return matchesQ && matchesDept && matchesUrgency;
    });
  }, [categories, search, selectedDeptId, urgencyFilter]);

  /* --------------- Dept modal selection handler --------------- */
  const handleDeptPick = (id: number) => {
    if (deptModalTarget === "filter") {
      setSelectedDeptId(id);
    } else if (deptModalTarget === "create") {
      setSelectedDeptId(id);
    } else if (deptModalTarget === "edit") {
      setEditDeptId(id);
    }
    setDeptModalVisible(false);
  };

  /* --------------- UI loading --------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0369a1" />
      </View>
    );
  }

  /* helpers for urgency display */
  const urgencyLabel = (level?: number | null) => {
    if (level === 3) return "High";
    if (level === 2) return "Medium";
    if (level === 1) return "Low";
    return "—";
  };
  const urgencyColor = (level?: number | null) => {
    if (level === 3) return "#ef4444";
    if (level === 2) return "#f59e0b";
    if (level === 1) return "#10b981";
    return "#94a3b8";
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Incident Categories</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onRefresh} accessibilityLabel="Refresh">
            <Ionicons name="refresh" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & actions */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories or departments"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search categories"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>

        {/* Department filter chip */}
        <TouchableOpacity
          style={styles.deptFilter}
          onPress={() => {
            setDeptModalTarget("filter");
            setDeptModalVisible(true);
          }}
          accessibilityLabel="Filter by department"
        >
          <Ionicons name="layers" size={14} color="#0369a1" />
          <Text style={styles.deptFilterText}>
            {selectedDeptId ? departments.find((d) => d.id === selectedDeptId)?.name ?? "Department" : "All"}
          </Text>
          {selectedDeptId ? (
            <Pressable
              onPress={() => setSelectedDeptId(null)}
              style={styles.removeChip}
              accessibilityLabel="Clear department filter"
            >
              <Ionicons name="close" size={14} color="#475569" />
            </Pressable>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Urgency filter (below search) */}
      <View style={styles.urgencyFilterRow}>
        <TouchableOpacity
          style={[
            styles.urgencyFilterChip,
            urgencyFilter === null && styles.urgencyFilterChipActive,
          ]}
          onPress={() => setUrgencyFilter(null)}
        >
          <Text style={[styles.urgencyFilterText, urgencyFilter === null && styles.urgencyFilterTextActive]}>All</Text>
        </TouchableOpacity>

        {[1, 2, 3].map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[
              styles.urgencyFilterChip,
              urgencyFilter === lvl && styles.urgencyFilterChipActive,
              { borderColor: urgencyColor(lvl) },
            ]}
            onPress={() => setUrgencyFilter(urgencyFilter === lvl ? null : lvl)}
          >
            <Text
              style={[
                styles.urgencyFilterText,
                urgencyFilter === lvl && { color: urgencyColor(lvl), fontWeight: "800" },
              ]}
            >
              {lvl === 1 ? "Low" : lvl === 2 ? "Medium" : "High"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyListContainer : { paddingBottom: 16 }}
        renderItem={({ item }) => (
<Pressable
  android_ripple={{ color: "#e6eef6" }}
  style={({ pressed }) => [
    styles.card,
    pressed && styles.cardPressed,
    { flexDirection: "row", padding: 16, alignItems: "flex-start" },
  ]}
  onPress={() => {
    setDetailItem(item);
    setDetailModalVisible(true);
  }}
  accessibilityLabel={`Open ${item.name}`}
>
  {/* Avatar + Urgency */}
  <View style={{ alignItems: "center", marginRight: 12 }}>
    <View
      style={[
        styles.urgencyBadge,
        {
          backgroundColor: urgencyColor(item.urgency_level) + "22",
          marginBottom: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
        },
      ]}
    >
      <Text
        style={[
          styles.urgencyText,
          { color: urgencyColor(item.urgency_level), fontSize: 12 },
        ]}
      >
        {urgencyLabel(item.urgency_level)}
      </Text>
    </View>

    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: "#e6f2ff",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: "#0369a1", fontSize: 18 }}>
        {item.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  </View>

  {/* Text content */}
  <View style={{ flex: 1 }}>
    <Text
      style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}
      numberOfLines={2}
    >
      {item.name}
    </Text>
    <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4 }} numberOfLines={1}>
      {item.department_name ?? "Unassigned"}
    </Text>

    {/* Edit/Delete buttons */}
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 12,
        gap: 12,
      }}
    >
      <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 6 }}>
        <Ionicons name="pencil" size={20} color="#0f172a" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          Alert.alert("Delete", `Delete category "${item.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => handleDelete(item.id),
            },
          ])
        }
        style={{ padding: 6 }}
      >
        <Ionicons name="trash" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  </View>
</Pressable>


        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first incident category.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setDeptModalTarget("create");
          openAddModal();
        }}
        accessibilityLabel="Add category"
      >
        <Ionicons name="add" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Category</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ padding: 16, flex: 1 }}>
            <Text style={styles.label}>Category name</Text>
            <TextInput style={styles.formInput} placeholder="Enter category name" value={newName} onChangeText={setNewName} returnKeyType="done" />

            <Text style={[styles.label, { marginTop: 12 }]}>Urgency</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setNewUrgency(lvl)}
                  style={[
                    styles.urgencyChoice,
                    newUrgency === lvl && { borderColor: urgencyColor(lvl), backgroundColor: urgencyColor(lvl) + "12" },
                  ]}
                >
                  <Text style={[styles.urgencyChoiceText, newUrgency === lvl && { color: urgencyColor(lvl) }]}>
                    {lvl === 1 ? "Low" : lvl === 2 ? "Medium" : "High"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Department (optional)</Text>
            <TouchableOpacity
              style={styles.chooseDept}
              onPress={() => {
                setDeptModalTarget("create");
                setDeptModalVisible(true);
              }}
            >
              <Text style={styles.chooseDeptText}>
                {selectedDeptId ? departments.find((d) => d.id === selectedDeptId)?.name ?? "Selected" : "Choose department"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#0f172a" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity style={[styles.submitBtn, (!newName.trim() || formSubmitting) && styles.submitBtnDisabled]} onPress={handleCreate} disabled={!newName.trim() || formSubmitting}>
              {formSubmitting ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="save" size={16} color="#fff" /><Text style={styles.submitText}>Save</Text></>)}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ padding: 16, flex: 1 }}>
            <Text style={styles.label}>Category name</Text>
            <TextInput style={styles.formInput} placeholder="Enter category name" value={editName} onChangeText={setEditName} returnKeyType="done" />

            <Text style={[styles.label, { marginTop: 12 }]}>Urgency</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setEditUrgency(lvl)}
                  style={[
                    styles.urgencyChoice,
                    editUrgency === lvl && { borderColor: urgencyColor(lvl), backgroundColor: urgencyColor(lvl) + "12" },
                  ]}
                >
                  <Text style={[styles.urgencyChoiceText, editUrgency === lvl && { color: urgencyColor(lvl) }]}>
                    {lvl === 1 ? "Low" : lvl === 2 ? "Medium" : "High"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Department (optional)</Text>
            <TouchableOpacity
              style={styles.chooseDept}
              onPress={() => { setDeptModalTarget("edit"); setDeptModalVisible(true); }}
            >
              <Text style={styles.chooseDeptText}>
                {editDeptId ? departments.find((d) => d.id === editDeptId)?.name ?? "Selected" : "Choose department"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#0f172a" />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={handleUpdate} disabled={editSubmitting}>
                {editSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#ef4444", opacity: editSubmitting ? 0.6 : 1 }]}
                onPress={() => editItem && handleDelete(editItem.id)}
                disabled={editSubmitting}
              >
                <Text style={styles.submitText}>Delete</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Department picker modal */}
      <Modal visible={deptModalVisible} animationType="slide" onRequestClose={() => setDeptModalVisible(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Departments</Text>
            <TouchableOpacity
              onPress={() => {
                if (deptModalTarget === "filter") setSelectedDeptId(null);
                if (deptModalTarget === "create") setSelectedDeptId(null);
                if (deptModalTarget === "edit") setEditDeptId(null);
                setDeptModalVisible(false);
              }}
            >
              <Text style={styles.modalClear}>Clear</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={departments}
            keyExtractor={(d) => d.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleDeptPick(item.id)}
                android_ripple={{ color: "#f1f5f9" }}
                style={({ pressed }) => [
                  styles.deptRow,
                  pressed && { opacity: 0.85 },
                  (deptModalTarget === "filter" && selectedDeptId === item.id) ||
                  (deptModalTarget === "create" && selectedDeptId === item.id) ||
                  (deptModalTarget === "edit" && editDeptId === item.id)
                    ? styles.deptRowSelected
                    : null,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{item.name}</Text>
                  {item.description ? <Text style={styles.deptDesc} numberOfLines={2}>{item.description}</Text> : null}
                </View>
                {((deptModalTarget === "filter" && selectedDeptId === item.id) ||
                  (deptModalTarget === "create" && selectedDeptId === item.id) ||
                  (deptModalTarget === "edit" && editDeptId === item.id)) && (
                  <Ionicons name="checkmark-circle" size={20} color="#0369a1" />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Detail modal */}
      <Modal visible={detailModalVisible} animationType="fade" onRequestClose={() => setDetailModalVisible(false)} transparent>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{detailItem?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{detailItem?.department_name ?? "Unassigned"}</Text>

            <Text style={[styles.detailLabel, { marginTop: 12 }]}>Urgency</Text>
            <Text style={styles.detailSmall}>{urgencyLabel(detailItem?.urgency_level ?? null)}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#e6eef6",
  },
  searchInput: { marginLeft: 8, flex: 1, height: "100%" },
  clearBtn: { padding: 6 },

  deptFilter: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6eef6",
  },
  deptFilterText: { marginLeft: 6, fontSize: 13, color: "#0f172a", maxWidth: 110 },
  removeChip: { marginLeft: 8, padding: 4 },

  /* urgency filter row below search */
  urgencyFilterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  urgencyFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e6eef6",
    backgroundColor: "#fff",
  },
  urgencyFilterChipActive: {
    backgroundColor: "#e6f2ff",
    borderColor: "#cfe8ff",
  },
  urgencyFilterText: {
    color: "#475569",
    fontSize: 13,
  },
  urgencyFilterTextActive: {
    color: "#0369a1",
    fontWeight: "800",
  },

  list: { flex: 1, marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },
  cardPressed: { opacity: 0.95 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#e6f2ff", justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "800", color: "#0369a1" },

  // Card body allows wrapping text and multiple lines
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    flexWrap: "wrap",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    flexWrap: "wrap",
  },

  // right side (urgency + small icons)
  cardRight: { marginLeft: 10,  justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: { padding: 4, marginLeft: 6, borderRadius: 6 }, // small tap target but tight spacing so text can show
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  urgencyText: { fontWeight: "700" },

  emptyListContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", justifyContent: "center", marginTop: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#475569" },
  emptySubtitle: { marginTop: 6, color: "#94a3b8" },

  /* FAB */
  fab: {
    position: "absolute",
    right: 18,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0369a1",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
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
  modalClear: { color: "#0369a1", fontWeight: "600" },

  label: { color: "#475569", fontSize: 12, marginBottom: 8, marginTop: 6 },
  formInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6eef6",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  chooseDept: { marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chooseDeptText: { color: "#0f172a", fontWeight: "600" },

  submitBtn: { backgroundColor: "#0369a1", height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "800" },

  /* department rows */
  deptRow: { padding: 12, borderRadius: 12, backgroundColor: "#f8fafc", flexDirection: "row", alignItems: "center" },
  deptRowSelected: { backgroundColor: "#e6f2ff", borderColor: "#d7f0ff" },
  deptName: { fontWeight: "800", color: "#0f172a" },
  deptDesc: { marginTop: 4, color: "#475569" },

  /* detail modal */
  detailOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "center", padding: 20 },
  detailCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  detailLabel: { marginTop: 12, fontSize: 12, color: "#475569" },
  detailValue: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#0f172a" },
  detailSmall: { color: "#475569", fontSize: 13 },

  /* urgency UI */
  urgencyChoice: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6", backgroundColor: "#fff" },
  urgencyChoiceText: { fontWeight: "700", color: "#475569" },
  // urgencyBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  // urgencyText: { fontWeight: "700" },
});
