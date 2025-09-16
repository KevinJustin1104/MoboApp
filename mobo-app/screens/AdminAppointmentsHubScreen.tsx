// screens/AdminAppointmentsHubScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { getDepartments, type Department } from "../services/department";
import {
  listServices,
  listAdminSchedules,          // ⬅️ NEW
  type AppointmentService,
  type AdminScheduleOut as AdminSchedule,
} from "../services/appointments";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminAppointmentsHubScreen() {
  const nav = useNavigation<any>();

  // Filters
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [deptOpen, setDeptOpen] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);

  // UX helpers
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async (id: number | null) => {
    setLoading(true);
    try {
      const [svc, sch] = await Promise.all([
        listServices(id ?? undefined),
        listAdminSchedules(id ?? undefined),
      ]);
      setServices(svc || []);
      setSchedules(sch || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const deps = await getDepartments().catch(() => [] as Department[]);
      setDepartments(deps);
      const first = deps?.[0]?.id ?? null;
      setDeptId(first);
      await loadAll(first);
    })();
  }, [loadAll]);

  useEffect(() => {
    loadAll(deptId);
  }, [deptId, loadAll]);

  const selectedDeptName = useMemo(
    () => departments.find((d) => d.id === deptId)?.name ?? "Select…",
    [departments, deptId]
  );

  const searchedServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const schedulesByService = useMemo(() => {
    const map = new Map<number, AdminSchedule[]>();
    for (const s of schedules) {
      if (!map.has(s.service_id)) map.set(s.service_id, []);
      map.get(s.service_id)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) =>
        a.day_of_week === b.day_of_week
          ? a.start_time.localeCompare(b.start_time)
          : a.day_of_week - b.day_of_week
      );
    }
    return map;
  }, [schedules]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ padding: 16, gap: 12 as any }}>
        {/* Department */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Department</Text>
          <TouchableOpacity style={styles.fieldBtn} onPress={() => setDeptOpen(true)}>
            <Text style={[styles.fieldValue, !deptId && styles.placeholder]} numberOfLines={1}>
              {selectedDeptName}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Quick actions row */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnPurple]}
            onPress={() => nav.navigate("AdminAppointmentServiceCreate")}
            activeOpacity={0.9}
          >
            <Ionicons name="construct-outline" size={18} color="#4f46e5" />
            <Text style={[styles.quickBtnText, { color: "#3730a3" }]}>New Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnCyan]}
            onPress={() => nav.navigate("AdminAppointmentSchedulesCreate")}
            activeOpacity={0.9}
          >
            <Ionicons name="calendar-outline" size={18} color="#0891b2" />
            <Text style={[styles.quickBtnText, { color: "#155e75" }]}>New Schedules</Text>
          </TouchableOpacity>
        </View>

        {/* Search — now below quick actions to prevent overlap */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search services"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, gap: 14 as any }}>
              {/* Services */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.iconPill, { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}>
                      <Ionicons name="document-text-outline" size={16} color="#0f172a" />
                    </View>
                    <Text style={styles.sectionTitle}>Services</Text>
                    <Text style={styles.countPill}>{searchedServices.length}</Text>
                  </View>
                </View>

                {searchedServices.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No services found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 as any }}>
                    {searchedServices.map((s) => (
                      <View key={s.id} style={styles.rowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.svcName}>{s.name}</Text>
                          <Text style={styles.svcMeta}>
                            {s.duration_min} min • {s.capacity_per_slot}/slot
                            {s.description ? ` — ${s.description}` : ""}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.rowAction}
                          onPress={() => nav.navigate("AdminAppointmentServiceCreate", { serviceId: s.id })}
                        >
                          <Ionicons name="create-outline" size={18} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Schedules */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.iconPill, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                      <Ionicons name="calendar-number-outline" size={16} color="#065F46" />
                    </View>
                    <Text style={styles.sectionTitle}>Schedules</Text>
                    <Text style={styles.countPill}>{schedules.length}</Text>
                  </View>
                </View>

                {schedules.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No schedules created</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 as any }}>
                    {services.map((svc) => {
                      const rows = (schedulesByService.get(svc.id) || []);
                      if (rows.length === 0) return null;

                      return (
                        <View key={svc.id} style={styles.groupCard}>
                          <View style={styles.groupHeader}>
                            <Text style={styles.groupTitle}>{svc.name}</Text>
                            <Text style={styles.groupMeta}>
                              {svc.duration_min} min • {svc.capacity_per_slot}/slot
                            </Text>
                          </View>

                          <View style={styles.scheduleGrid}>
                            {rows.map((r) => (
                              <View key={r.id} style={styles.scheduleChip}>
                                <Text style={styles.scheduleChipText}>
                                  {dayNames[r.day_of_week]} {r.start_time}–{r.end_time}
                                </Text>
                                {(r.valid_from || r.valid_to) ? (
                                  <Text style={styles.scheduleChipMeta}>
                                    {r.valid_from || "…"} → {r.valid_to || "…"}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          }
          data={[]}
          renderItem={() => null}
        />
      )}

      {/* Department picker */}
      <Modal visible={deptOpen} transparent animationType="fade" onRequestClose={() => setDeptOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDeptOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select department</Text>
            <View style={{ marginTop: 6, gap: 8 as any }}>
              {departments.map((d) => {
                const active = deptId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.optionRow, active && styles.optionActive]}
                    onPress={() => { setDeptId(d.id); setDeptOpen(false); }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                      {d.name}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={16} color="#065F46" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ alignItems: "flex-end", marginTop: 12 }}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setDeptOpen(false)}>
                <Text style={styles.btnGhostText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f8fb" },

  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "900", fontSize: 18, color: "#0f172a" },

  fieldCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 12 },
  fieldLabel: { color: "#6b7280", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  fieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldValue: { color: "#0f172a", fontWeight: "800", flex: 1, marginRight: 8 },
  placeholder: { color: "#94a3b8" },

  // Quick actions row — two buttons side-by-side
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  quickBtnText: { fontWeight: "800" },
  quickBtnPurple: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  quickBtnCyan: { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" },

  // Search below quick actions
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", fontWeight: "700", paddingVertical: 0 },

  // Sections
  sectionCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", padding: 14 },
  sectionHeader: { marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconPill: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontWeight: "900", fontSize: 16, color: "#0f172a" },
  countPill: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F1F5F9",
    color: "#334155",
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "800",
    fontSize: 12,
  },

  emptyState: { alignItems: "center", paddingVertical: 20 },
  emptyText: { color: "#64748b", fontWeight: "700" },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rowAction: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#F8FAFC",
  },
  svcName: { color: "#0f172a", fontWeight: "900" },
  svcMeta: { color: "#64748b", marginTop: 2, fontSize: 12 },

  groupCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 10 },
  groupHeader: { marginBottom: 8 },
  groupTitle: { fontWeight: "900", color: "#0f172a" },
  groupMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },

  scheduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scheduleChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },
  scheduleChipText: { fontWeight: "800", color: "#0f172a" },
  scheduleChipMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#e5e7eb" },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a", marginBottom: 10 },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionActive: { backgroundColor: "#ECFDF5", borderColor: "#86EFAC" },
  optionText: { color: "#0f172a", fontWeight: "800", flex: 1, marginRight: 8 },
  optionTextActive: { color: "#065F46" },

  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnGhost: { backgroundColor: "#F1F5F9" },
  btnGhostText: { color: "#0f172a", fontWeight: "900" },
});
