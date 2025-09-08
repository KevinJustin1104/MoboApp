// mobo-app/screens/AdminCreateDepartmentStaff.tsx
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
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import {
  fetchStaffList,
  createDepartmentStaff,
  type CreateStaffPayload,
  type UserOut,
} from "../services/departmentStaff";
import { Department, getDepartments } from "../services/department";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genPass = (len = 12) =>
  Array.from({ length: len }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*".charAt(
      Math.floor(Math.random() * 70)
    )
  ).join("");

export default function AdminCreateDepartmentStaffScreen() {
  const navigation = useNavigation();

  // data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<UserOut[]>([]);

  // loading
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // search
  const [search, setSearch] = useState("");

  // create staff modal + dept picker
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deptPickerOpen, setDeptPickerOpen] = useState(false);

  // selected dept for creation
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(genPass());
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // staff detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<UserOut | null>(null);

  // helper: map department_id/name safely
  const getDepartmentName = (u?: Pick<UserOut, "department_id" | "department_name">) => {
    if (!u) return "Unassigned";
    return (
      u.department_name ??
      departments.find((d) => String(d.id) === String(u.department_id))?.name ??
      "Unassigned"
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffList] = await Promise.all([ fetchStaffList()]);
      const data = await getDepartments();
      console.log('departments', data);
      setDepartments(data ?? []);
      setStaff(staffList ?? []);
      // Preselect first department if none selected yet
      if (!selectedDept && (data?.length ?? 0) > 0) {
        setSelectedDept(data[0]);
      }
    } catch (err) {
      console.warn("loadData error", err);
      setDepartments([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Also ensure when departments change later, we keep a default
  useEffect(() => {
    if (!selectedDept && departments.length > 0) {
      setSelectedDept(departments[0]);
    }
  }, [departments, selectedDept]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // search across name/email/department
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((u) => {
      const deptName = (getDepartmentName(u) || "").toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        deptName.includes(q)
      );
    });
  }, [staff, search, departments]);

  // open create modal
  const openCreate = (presetDept?: Department) => {
    setSelectedDept(presetDept ?? selectedDept ?? departments[0] ?? null);
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword(genPass());
    setShowPassword(false);
    setCreateModalVisible(true);
  };

  const closeCreate = () => setCreateModalVisible(false);

  const openDetail = (user: UserOut) => {
    setDetailItem(user);
    setDetailVisible(true);
  };

  const closeDetail = () => setDetailVisible(false);

  const validate = () => {
    if (!selectedDept) return Alert.alert("Validation", "Select a department."), false;
    if (!fullName.trim()) return Alert.alert("Validation", "Full name is required."), false;
    if (!emailRegex.test(email.trim())) return Alert.alert("Validation", "Enter a valid email."), false;
    if (password.length < 8)
      return Alert.alert("Validation", "Password must be at least 8 characters."), false;
    return true;
  };

  const handleSaveStaff = async () => {
    if (!validate() || !selectedDept) return;
    setSubmitting(true);
    try {
      const payload: CreateStaffPayload = {
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      };
      await createDepartmentStaff(selectedDept.id, payload);
      Alert.alert("Success", `User "${fullName}" created in ${selectedDept.name}.`);
      closeCreate();
      await onRefresh();
    } catch (err: any) {
      console.warn("createDepartmentStaff error", err);
      const msg = err?.response?.data?.detail || err?.message || "Failed to create user";
      Alert.alert("Error", String(msg));
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Department Staff</Text>
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
            placeholder="Search name, email, or department"
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

      {/* STAFF LIST */}
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyListContainer : undefined}
        renderItem={({ item }) => (
          <Pressable
            android_ripple={{ color: "#e6eef6" }}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => openDetail(item)}
            accessibilityLabel={`Open ${item.name}`}
          >
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || item.email || "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name || "(No name)"}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={styles.cardSubtitleMuted} numberOfLines={1}>
                  {getDepartmentName(item)}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-circle-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No staff found</Text>
            <Text style={styles.emptySubtitle}>Tap + to add the first staff.</Text>
          </View>
        }
      />

      {/* FAB: open create staff */}
      <TouchableOpacity style={styles.fab} onPress={() => openCreate()} accessibilityLabel="Create staff">
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Staff Modal */}
      <Modal visible={createModalVisible} animationType="slide" onRequestClose={closeCreate}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Staff</Text>
            <TouchableOpacity onPress={closeCreate}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {/* Department selector */}
              <Text style={styles.label}>Department</Text>
              <Pressable
                onPress={() => setDeptPickerOpen(true)}
                style={styles.formInputRow}
                android_ripple={{ color: "#e6eef6" }}
                accessibilityLabel="Select department"
              >
                <Ionicons name="business-outline" size={18} color="#475569" />
                <Text style={styles.formInputRowText}>
                  {selectedDept ? selectedDept.name : "Choose a department"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#475569" />
              </Pressable>
              {departments.length === 0 && (
                <Text style={{ color: "#b91c1c", marginTop: 6, fontSize: 12 }}>
                  No departments loaded. Pull to refresh or check permissions.
                </Text>
              )}

              {/* Full name */}
              <Text style={[styles.label, { marginTop: 12 }]}>Full name</Text>
              <View style={styles.formInputRow}>
                <Ionicons name="person-outline" size={18} color="#475569" />
                <TextInput
                  style={styles.formTextInput}
                  placeholder="e.g. Jane Dela Cruz"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Email */}
              <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
              <View style={styles.formInputRow}>
                <Ionicons name="mail-outline" size={18} color="#475569" />
                <TextInput
                  style={styles.formTextInput}
                  placeholder="e.g. jane@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Phone */}
              <Text style={[styles.label, { marginTop: 12 }]}>Phone (optional)</Text>
              <View style={styles.formInputRow}>
                <Ionicons name="call-outline" size={18} color="#475569" />
                <TextInput
                  style={styles.formTextInput}
                  placeholder="e.g. +65 9123 4567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Password */}
              <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
              <View style={styles.formInputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#475569" />
                <TextInput
                  style={styles.formTextInput}
                  placeholder="Temporary password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#475569" />
                </Pressable>
              </View>

              <Pressable onPress={() => setPassword(genPass())} style={styles.generateBtn}>
                <Ionicons name="refresh-outline" size={16} color="#0369a1" />
                <Text style={styles.generateText}>Generate strong password</Text>
              </Pressable>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (submitting ||
                    !selectedDept ||
                    !fullName.trim() ||
                    !emailRegex.test(email.trim()) ||
                    password.length < 8) && styles.submitBtnDisabled,
                ]}
                onPress={handleSaveStaff}
                disabled={
                  submitting ||
                  !selectedDept ||
                  !fullName.trim() ||
                  !emailRegex.test(email.trim()) ||
                  password.length < 8
                }
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Staff</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Staff detail modal */}
      <Modal visible={detailVisible} animationType="fade" transparent onRequestClose={closeDetail}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{detailItem?.name ?? "(No name)"}</Text>
              <TouchableOpacity onPress={closeDetail}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailSmall}>{detailItem?.email}</Text>

            <Text style={[styles.detailLabel, { marginTop: 8 }]}>Department</Text>
            <Text style={styles.detailSmall}>{getDepartmentName(detailItem || undefined)}</Text>

            {!!detailItem?.phone && (
              <>
                <Text style={[styles.detailLabel, { marginTop: 8 }]}>Phone</Text>
                <Text style={styles.detailSmall}>{detailItem?.phone}</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Department picker overlay (inside create modal) */}
      <Modal
        visible={deptPickerOpen}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"   // important for nested modals on Android
        statusBarTranslucent                 // helps overlay look correct
        onRequestClose={() => setDeptPickerOpen(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={[styles.detailCard, { maxHeight: "70%" }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setDeptPickerOpen(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={departments}
              keyExtractor={(i) => String(i.id)}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: "#e6eef6",
                    marginVertical: 4,
                  }}
                />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedDept(item);
                    setDeptPickerOpen(false);
                  }}
                  style={styles.deptRow}
                  android_ripple={{ color: "#f1f5f9" }}
                >
                  <Ionicons
                    name={
                      selectedDept?.id === item.id
                        ? "radio-button-on-outline"
                        : "radio-button-off-outline"
                    }
                    size={18}
                    color="#0ea5e9"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deptName}>{item.name}</Text>
                    <Text style={styles.deptDesc}>{item.description || "No description"}</Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ paddingVertical: 16 }}>
                  <Text style={{ textAlign: "center", color: "#64748b" }}>
                    No departments available.
                  </Text>
                </View>
              }
            />
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
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#0f172a" },
  headerRight: { width: 36, alignItems: "flex-end" },

  toolbar: { paddingHorizontal: 16, paddingVertical: 10 },
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
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
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
      ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },

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
  formInputRow: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6eef6",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formInputRowText: { flex: 1, color: "#0f172a" },
  formTextInput: { flex: 1, color: "#0f172a" },

  generateBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 8 },
  generateText: { color: "#0369a1", fontWeight: "700", fontSize: 12 },

  submitBtn: {
    backgroundColor: "#0369a1",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "800" },

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

  deptRow: { paddingVertical: 12, paddingHorizontal: 4, flexDirection: "row", gap: 10, alignItems: "center" },
  deptName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  deptDesc: { fontSize: 12, color: "#64748b" },
});
