// src/screens/AdminAppointmentSchedulesCreateScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  postAdminSchedules,
  type AdminScheduleCreateInput,
  listServices,
  type AppointmentService,
} from "../services/appointments";
import FeedbackModal from "../components/SuccessMessage";
import { FormTime, FormDate } from "../components/DateTimeFields";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Row = {
  day_of_week: number;       // used only when weekdaysOnly = false
  start_time: string;        // "HH:MM"
  end_time: string;          // "HH:MM"
  slot_minutes?: string;     // optional override (string for input)
  capacity_per_slot?: string;// optional override
  timezone?: string;         // e.g. "Asia/Manila"
};

const isTime = (v: string) =>
  /^\d{2}:\d{2}$/.test(v) &&
  Number(v.slice(0, 2)) < 24 &&
  Number(v.slice(3)) < 60;

export default function AdminAppointmentSchedulesCreateScreen() {
  const nav = useNavigation<any>();

  // ----- Service picker -----
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcLoading, setSvcLoading] = useState(false);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setSvcLoading(true);
      try {
        const list = await listServices();
        if (mounted) setServices(list || []);
      } catch {
        if (mounted) setServices([]);
      } finally {
        if (mounted) setSvcLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ----- Top-level date range + weekdays toggle -----
  const todayYMD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const [rangeStart, setRangeStart] = useState<string>(todayYMD());
  const [rangeEnd, setRangeEnd] = useState<string>(todayYMD());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);

  // ----- Blocks -----
  const [rows, setRows] = useState<Row[]>([
    { day_of_week: 0, start_time: "08:00", end_time: "12:00", slot_minutes: "", capacity_per_slot: "", timezone: "Asia/Manila" },
  ]);

  const addRow = () => setRows((r) => [...r, { ...r[r.length - 1] }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const setField = (i: number, key: keyof Row, val: string | number) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val as any } : row)));
  };

  const [saving, setSaving] = useState(false);

  // ----- Feedback modal -----
  const [dialog, setDialog] = useState<{
    visible: boolean;
    variant?: "success" | "error" | "info";
    title?: string;
    message: string;
    afterClose?: () => void;
  }>({ visible: false, message: "" });

  // ----- Build payload (expands Mon–Fri if weekdaysOnly) -----
  const payload: AdminScheduleCreateInput[] = useMemo(() => {
    if (!selectedService) return [];
    const blocks: AdminScheduleCreateInput[] = [];

    const baseDays = weekdaysOnly ? [0, 1, 2, 3, 4] : null; // Mon..Fri

    for (const r of rows) {
      const dayList = baseDays ?? [r.day_of_week];
      for (const d of dayList) {
        blocks.push({
          service_id: selectedService.id,
          day_of_week: d,
          start_time: r.start_time,
          end_time: r.end_time,
          slot_minutes: r.slot_minutes ? Number(r.slot_minutes) : null,
          capacity_per_slot: r.capacity_per_slot ? Number(r.capacity_per_slot) : null,
          valid_from: rangeStart || null,
          valid_to: rangeEnd || null,
          timezone: r.timezone || null,
        });
      }
    }
    return blocks;
  }, [rows, selectedService, rangeStart, rangeEnd, weekdaysOnly]);

  const submit = async () => {
    // Validate service
    if (!selectedService) {
      setDialog({ visible: true, variant: "error", title: "Select service", message: "Please choose a service." });
      return;
    }
    // Validate range
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rangeStart) || !/^\d{4}-\d{2}-\d{2}$/.test(rangeEnd) || rangeStart > rangeEnd) {
      setDialog({
        visible: true,
        variant: "error",
        title: "Date range",
        message: "Please pick a valid start and end date (YYYY-MM-DD), with start ≤ end.",
      });
      return;
    }
    // Validate rows
    for (const [i, r] of rows.entries()) {
      if (!isTime(r.start_time) || !isTime(r.end_time)) {
        setDialog({ visible: true, variant: "error", title: "Invalid time", message: `Block #${i + 1}: Use HH:MM.` });
        return;
      }
      if (r.start_time >= r.end_time) {
        setDialog({ visible: true, variant: "error", title: "Time range", message: `Block #${i + 1}: Start must be before end.` });
        return;
      }
      if (r.slot_minutes) {
        const n = Number(r.slot_minutes);
        if (isNaN(n) || n < 5 || n > 240) {
          setDialog({ visible: true, variant: "error", title: "Appointment length", message: `Block #${i + 1}: 5–240 minutes.` });
          return;
        }
      }
      if (r.capacity_per_slot) {
        const n = Number(r.capacity_per_slot);
        if (isNaN(n) || n < 1 || n > 50) {
          setDialog({ visible: true, variant: "error", title: "Capacity per slot", message: `Block #${i + 1}: 1–50 people.` });
          return;
        }
      }
    }

    setSaving(true);
    try {
      await postAdminSchedules(payload);
      setDialog({
        visible: true,
        variant: "success",
        title: "Schedules created",
        message: `Saved ${payload.length} block${payload.length > 1 ? "s" : ""} for ${selectedService.name}.`,
        afterClose: () => nav.goBack(),
      });
    } catch (e: any) {
      setDialog({
        visible: true,
        variant: "error",
        title: "Failed to create schedules",
        message: e?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f6f8fb" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Schedules</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Service selector */}
        <View style={styles.card}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.help}>Choose which office/service these hours apply to.</Text>
          <TouchableOpacity style={styles.select} activeOpacity={0.85} onPress={() => setSvcOpen(true)}>
            <Text style={!selectedService ? styles.selectPlaceholder : styles.selectText} numberOfLines={1}>
              {selectedService ? selectedService.name : "Select service"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
          {selectedService ? (
            <Text style={styles.smallNote}>
              Default length <Text style={styles.smallBold}>{selectedService.duration_min} min</Text> • Default capacity{" "}
              <Text style={styles.smallBold}>{selectedService.capacity_per_slot}</Text>
            </Text>
          ) : null}
        </View>

        {/* Date range + weekdays */}
        <View style={styles.card}>
          <Text style={styles.label}>Active date range</Text>
          <Text style={styles.help}>Schedules will be active only within this period.</Text>
          <View style={{ flexDirection: "row", gap: 10 as any }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Start</Text>
              <FormDate value={rangeStart} onChange={setRangeStart} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>End</Text>
              <FormDate value={rangeEnd} onChange={setRangeEnd} />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setWeekdaysOnly((v) => !v)}
            style={[styles.toggle, weekdaysOnly && styles.toggleOn]}
            activeOpacity={0.9}
          >
            <View style={[styles.knob, weekdaysOnly && styles.knobOn]} />
            <Text style={[styles.toggleText, weekdaysOnly && styles.toggleTextOn]}>
              {weekdaysOnly ? "Weekdays only (Mon–Fri)" : "Custom days (enable below)"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Blocks */}
        {rows.map((r, i) => (
          <View key={i} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "900", color: "#0f172a" }}>Time block #{i + 1}</Text>
              {rows.length > 1 ? (
                <TouchableOpacity onPress={() => removeRow(i)} style={styles.removeBtn} accessibilityLabel={`Remove block ${i + 1}`}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            {!weekdaysOnly && (
              <>
                <Text style={styles.label}>Day of week</Text>
                <Text style={styles.help}>Pick the day this time block belongs to.</Text>
                <View style={styles.daysRow}>
                  {days.map((d, idx) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setField(i, "day_of_week", idx)}
                      style={[styles.dayChip, r.day_of_week === idx && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayChipText, r.day_of_week === idx && styles.dayChipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Start / End time */}
            <View style={{ flexDirection: "row", gap: 10 as any }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start time</Text>
                <FormTime value={r.start_time} onChange={(v) => setField(i, "start_time", v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End time</Text>
                <FormTime value={r.end_time} onChange={(v) => setField(i, "end_time", v)} />
              </View>
            </View>

            {/* Overrides */}
            <View style={{ flexDirection: "row", gap: 10 as any }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Appointment length (minutes)</Text>
                <TouchableOpacity
                  style={styles.select}
                  activeOpacity={0.85}
                  onPress={() => {
                    const cycle = ["", "10", "15", "20"];
                    const idx = Math.max(0, cycle.indexOf(r.slot_minutes || ""));
                    const next = cycle[(idx + 1) % cycle.length];
                    setField(i, "slot_minutes", next);
                  }}
                >
                  <Text style={r.slot_minutes ? styles.selectText : styles.selectPlaceholder}>
                    {r.slot_minutes || `Default (${selectedService?.duration_min ?? "…"})`}
                  </Text>
                  <Ionicons name="repeat-outline" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>People per slot</Text>
                <TouchableOpacity
                  style={styles.select}
                  activeOpacity={0.85}
                  onPress={() => {
                    const cycle = ["", "1", "2", "3"];
                    const idx = Math.max(0, cycle.indexOf(r.capacity_per_slot || ""));
                    const next = cycle[(idx + 1) % cycle.length];
                    setField(i, "capacity_per_slot", next);
                  }}
                >
                  <Text style={r.capacity_per_slot ? styles.selectText : styles.selectPlaceholder}>
                    {r.capacity_per_slot || `Default (${selectedService?.capacity_per_slot ?? "…"})`}
                  </Text>
                  <Ionicons name="repeat-outline" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Timezone */}
            <Text style={styles.label}>Timezone</Text>
            <TouchableOpacity
              style={styles.select}
              activeOpacity={0.85}
              onPress={() => setField(i, "timezone", r.timezone ? "" : "Asia/Manila")}
            >
              <Text style={r.timezone ? styles.selectText : styles.selectPlaceholder}>
                {r.timezone || "Default device/server timezone"}
              </Text>
              <Ionicons name="globe-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.secondaryBtn} onPress={addRow}>
          <Ionicons name="add" size={18} color="#2563eb" />
          <Text style={styles.secondaryText}>Add another block</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "Saving..." : "Create Schedules"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Service picker modal */}
      <Modal visible={svcOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose service</Text>
              <TouchableOpacity onPress={() => setSvcOpen(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {svcLoading ? (
                <View style={styles.emptyState}><Text style={{ color: "#64748b" }}>Loading…</Text></View>
              ) : services.length === 0 ? (
                <View style={styles.emptyState}><Text style={{ color: "#64748b" }}>No services found</Text></View>
              ) : (
                services.map((s) => (
                  <TouchableOpacity key={s.id} style={styles.svcRow} onPress={() => { setSelectedService(s); setSvcOpen(false); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.svcName}>{s.name}</Text>
                      <Text style={styles.svcMeta}>
                        {s.duration_min} min · {s.capacity_per_slot} per slot{ s.description ? ` — ${s.description}` : "" }
                      </Text>
                    </View>
                    {selectedService?.id === s.id ? <Ionicons name="checkmark-circle" size={20} color="#2563eb" /> : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelectedService(null); setSvcOpen(false); }}>
                <Text style={styles.clearText}>Clear selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback modal */}
      <FeedbackModal
        visible={dialog.visible}
        variant={dialog.variant}
        title={dialog.title}
        message={dialog.message}
        onClose={() => {
          const next = dialog.afterClose;
          setDialog((d) => ({ ...d, visible: false, afterClose: undefined }));
          next?.();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "900", fontSize: 18, color: "#0f172a" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  label: { color: "#0f172a", fontWeight: "800", marginBottom: 6 },
  subLabel: { color: "#334155", fontWeight: "700", marginBottom: 6, fontSize: 12 },
  help: { color: "#64748b", fontSize: 12, marginBottom: 8 },

  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectPlaceholder: { color: "#94a3b8" },
  selectText: { color: "#0f172a", fontWeight: "700" },

  // Toggle
  toggle: {
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleOn: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#CBD5E1" },
  knobOn: { backgroundColor: "#10B981" },
  toggleText: { color: "#334155", fontWeight: "700" },
  toggleTextOn: { color: "#065F46" },

  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 as any, marginBottom: 4 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  dayChipActive: { backgroundColor: "#dbeafe", borderColor: "#93c5fd" },
  dayChipText: { color: "#0f172a", fontWeight: "600" },
  dayChipTextActive: { color: "#1e40af" },

  removeBtn: { padding: 6, borderRadius: 8, backgroundColor: "#fee2e2" },

  secondaryBtn: {
    flexDirection: "row",
    gap: 8 as any,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    marginTop: 6,
  },
  secondaryText: { color: "#2563eb", fontWeight: "900" },

  saveBtn: { marginTop: 14, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "900" },

  // Modal (service picker)
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", padding: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  modalFooter: { paddingTop: 8 },

  emptyState: { paddingVertical: 26, alignItems: "center" },
  svcRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
  },
  svcName: { fontWeight: "800", color: "#0f172a" },
  svcMeta: { color: "#64748b", marginTop: 2, fontSize: 12 },

  iconBtn: { padding: 6, borderRadius: 8 },
  clearBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f1f5f9" },
  clearText: { color: "#0f172a", fontWeight: "800" },

  smallNote: { color: "#475569", fontSize: 12, marginTop: 8 },
  smallBold: { fontWeight: "900", color: "#0f172a" },
});
