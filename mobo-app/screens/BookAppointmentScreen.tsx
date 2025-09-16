// src/screens/BookAppointmentScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, PropsWithChildren } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
  Modal,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import {
  listServices,       // accepts optional department_id
  getSlots,           // sends { day: 'YYYY-MM-DD' } to backend
  bookAppointment,
  myAppointments,
  type AppointmentService,
  type Slot,
  type Appointment,
  toLocalYMD,
} from "../services/appointments";
import { getDepartments, type Department } from "../services/department";
import QueueNowBanner from "../components/QueueNowBanner";
import { useNavigation } from "@react-navigation/native";

/** ——— helpers ——— */
const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Small UI helpers */
const SectionCard = ({ children }: PropsWithChildren) => <View style={styles.sectionCard}>{children}</View>;

type Tone = "primary" | "emerald";
const tonePalette: Record<Tone, { bg: string; bd: string; icon: string }> = {
  primary: { bg: "#EFF6FF", bd: "#DBEAFE", icon: "#2563eb" },
  emerald: { bg: "#ECFDF5", bd: "#A7F3D0", icon: "#059669" },
};

const StepHeader = ({
  icon,
  title,
  right,
  tone = "primary",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  right?: React.ReactNode;
  tone?: Tone;
}) => {
  const p = tonePalette[tone];
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepIconWrap, { backgroundColor: p.bg, borderColor: p.bd }]}>
        <Ionicons name={icon} size={16} color={p.icon} />
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
};

const ScrollCue = () => (
  <View style={styles.scrollCue} pointerEvents="none">
    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
  </View>
);

export default function BookAppointmentScreen() {
  const nav = useNavigation<any>();

  // ---- departments & services
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [deptId, setDeptId] = useState<number | null>(null);

  const [services, setServices] = useState<AppointmentService[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [selService, setSelService] = useState<AppointmentService | null>(null);

  // ---- date & slots
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ---- my appts
  const [myAppts, setMyAppts] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // ---- booking modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);

  // ---- department dropdown modal
  const [deptPickerOpen, setDeptPickerOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");

  const selectedDeptName = useMemo(
    () => departments.find((d) => d.id === deptId)?.name ?? "Select…",
    [departments, deptId]
  );

  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, deptQuery]);

  /** Load services for department */
  const loadServicesForDept = useCallback(
    async (id: number | null) => {
      setLoadingSvc(true);
      try {
        const svcs = await listServices(id ?? undefined);
        setServices(svcs);
        setSelService(svcs[0] ?? null);
      } finally {
        setLoadingSvc(false);
      }
    },
    []
  );

  /** Initial load: departments + my bookings */
  useEffect(() => {
    (async () => {
      try {
        const [deps, appts] = await Promise.all([
          getDepartments().catch(() => [] as Department[]),
          myAppointments().catch(() => [] as Appointment[]),
        ]);
        setDepartments(deps);
        const firstDeptId = deps?.[0]?.id ?? null;
        setDeptId(firstDeptId);
        setMyAppts(appts);
        await loadServicesForDept(firstDeptId);
      } finally {
        setLoadingDepts(false);
        setLoadingAppts(false);
      }
    })();
  }, [loadServicesForDept]);

  /** When department changes */
  useEffect(() => {
    loadServicesForDept(deptId);
  }, [deptId, loadServicesForDept]);

  /** Load slots */
  const loadSlots = useCallback(async () => {
    if (!selService) return;
    setLoadingSlots(true);
    try {
      const day = toLocalYMD(date);
      const s = await getSlots(selService.id, day);
      setSlots(s);
    } finally {
      setLoadingSlots(false);
    }
  }, [selService, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  /** Per-day rule (allow if ONLY cancelled) */
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const apptsOnSelectedDay: Appointment[] = useMemo(() => {
    return myAppts.filter((a) => sameDay(new Date(a.slot_start), date));
  }, [myAppts, date]);

  const hasNonCancelledOnDay = apptsOnSelectedDay.some((a) => a.status !== "cancelled");

  const findOverlapNonCancelled = (slot: Slot): Appointment | null => {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    for (const a of apptsOnSelectedDay) {
      if (a.status === "cancelled") continue;
      const s = new Date(a.slot_start).getTime();
      const e = new Date(a.slot_end).getTime();
      if (s < end && e > start) return a;
    }
    return null;
  };

  /** Date picking */
  const WebDateInput = () =>
    // @ts-ignore web-only element
    React.createElement("input", {
      type: "date",
      value: ymd(date),
      onChange: (e: any) => {
        const v: string = e?.target?.value;
        if (!v) return;
        const [Y, M, D] = v.split("-").map((n) => parseInt(n, 10));
        const d = new Date();
        d.setFullYear(Y, M - 1, D);
        d.setHours(0, 0, 0, 0);
        setDate(d);
      },
      style: {
        appearance: "auto",
        WebkitAppearance: "auto",
        padding: 10,
        borderRadius: 12,
        border: "1px solid #dbeafe",
        background: "#f1f5ff",
        color: "#1e40af",
        fontWeight: 700,
        outline: "none",
      },
    });

  const onPickDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        setShowPicker(false);
        return;
      }
      if (event.type === "set" && selected) {
        const d = new Date(selected);
        d.setHours(0, 0, 0, 0);
        setDate(d);
        setShowPicker(false);
      }
      return;
    }
    // iOS live update; close with "Done"
    if (selected) {
      const d = new Date(selected);
      d.setHours(0, 0, 0, 0);
      setDate(d);
    }
  };

  /** Booking flow */
  const onPressSlot = (slot: Slot) => {
    if (hasNonCancelledOnDay) {
      Alert.alert(
        "Limit reached",
        "You already have a booking that day. You can only book another if the previous one is cancelled."
      );
      return;
    }
    const conflict = findOverlapNonCancelled(slot);
    if (conflict) {
      const when = new Date(conflict.slot_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      Alert.alert("Already booked", `You already have an appointment around ${when}.`);
      return;
    }
    setPendingSlot(slot);
    setConfirmOpen(true);
  };

  const doBook = async () => {
    if (!selService || !pendingSlot) return;
    setBooking(true);
    try {
      const appt: Appointment = await bookAppointment(selService.id, pendingSlot.start);
      setConfirmOpen(false);
      setPendingSlot(null);
      nav.replace("AppointmentSuccess", { appt });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Slot was taken or booking failed. Please try another time.";
      Alert.alert("Booking failed", String(msg));
    } finally {
      setBooking(false);
    }
  };

  /** Header */
  const Header = useMemo(
    () => (
      <View style={{ padding: 16, paddingBottom: 0 }}>
        {/* Top bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book an Appointment</Text>
          <TouchableOpacity
            style={styles.headerLink}
            onPress={() => nav.navigate("MyAppointments")}
            accessibilityRole="button"
            accessibilityLabel="Open my previous bookings"
          >
            <Ionicons name="time-outline" size={16} color="#2563eb" />
            <Text style={styles.headerLinkText}>My Bookings</Text>
          </TouchableOpacity>
        </View>

        {/* STEP: Department (spacious form-field + roomy picker) */}
        <SectionCard>
          <StepHeader icon="business-outline" title="Department" tone="emerald" />
          <Text style={styles.formLabel}>Department</Text>
          <TouchableOpacity
            disabled={loadingDepts || departments.length === 0}
            onPress={() => setDeptPickerOpen(true)}
            style={styles.fieldBtn}
            accessibilityRole="button"
            accessibilityLabel="Select department"
          >
            <Text
              style={[styles.fieldValue, (!deptId || departments.length === 0) && styles.fieldPlaceholder]}
              numberOfLines={1}
            >
              {loadingDepts ? "Loading…" : departments.length === 0 ? "No departments" : selectedDeptName}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.helperText}>Pick a department to see its available services.</Text>
        </SectionCard>

        {/* STEP: Service (unchanged) */}
        <SectionCard>
          <StepHeader icon="document-text-outline" title="Service" right={<ScrollCue />} />
          {loadingSvc ? (
            <ActivityIndicator style={{ marginVertical: 6 }} />
          ) : services.length === 0 ? (
            <View style={styles.emptyPill}>
              <Text style={styles.emptyPillText}>No services in this department</Text>
            </View>
          ) : (
            <View>
              <FlatList
                data={services}
                horizontal
                keyExtractor={(i) => String(i.id)}
                showsHorizontalScrollIndicator
                contentContainerStyle={{ paddingRight: 10 }}
                renderItem={({ item }) => {
                  const active = selService?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.svcCard, active && styles.svcCardActive]}
                      onPress={() => setSelService(item)}
                      activeOpacity={0.92}
                    >
                      <View style={[styles.svcIcon, active && { backgroundColor: "#fff" }]}>
                        <Ionicons name="document-text-outline" size={18} color="#1e40af" />
                      </View>
                      <Text style={[styles.svcName, active && styles.svcNameActive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.svcMeta, active && styles.svcMetaActive]}>
                        {item.duration_min} min • {item.capacity_per_slot}/slot
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <ScrollCue />
            </View>
          )}
        </SectionCard>

        {/* Live queue banner */}
        {/* {(selService || deptId) ? (
          <View style={{ marginTop: 12 }}>
            <QueueNowBanner departmentId={selService?.department_id ?? (deptId as number)} />
          </View>
        ) : null} */}

        {/* STEP: Date */}
        <SectionCard>
          <StepHeader
            icon="calendar-outline"
            title="Date"
            right={
              Platform.OS === "web" ? (
                <WebDateInput />
              ) : (
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={styles.dateBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Pick date"
                >
                  <Ionicons name="calendar-outline" size={16} color="#1e40af" />
                  <Text style={styles.dateText}>
                    {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                </TouchableOpacity>
              )
            }
          />
          <View style={styles.chipsRow}>
            {["Today", "Tomorrow", "In 2 days"].map((lbl, idx) => (
              <TouchableOpacity
                key={lbl}
                style={[styles.quickChip, idx === 0 && styles.quickChipPrimary]}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + idx);
                  d.setHours(0, 0, 0, 0);
                  setDate(d);
                }}
              >
                <Text style={[styles.quickChipText, idx === 0 && styles.quickChipTextPrimary]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* Same-day rule note */}
        {loadingAppts ? (
          <ActivityIndicator style={{ marginTop: 6 }} />
        ) : hasNonCancelledOnDay ? (
          <View style={[styles.infoNote, { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
            <Text style={[styles.infoNoteText, { color: "#7C2D12" }]}>
              You already have a non-cancelled appointment on this day. Cancel it first to book again.
            </Text>
          </View>
        ) : null}

        <Text style={styles.gridTitle}>Available Slots</Text>
      </View>
    ),
    [
      departments,
      loadingDepts,
      deptId,
      services,
      loadingSvc,
      selService,
      date,
      nav,
      loadingAppts,
      hasNonCancelledOnDay,
      selectedDeptName,
    ]
  );

  /** Render */
  return (
    <View style={styles.container}>
      {loadingSlots && !slots.length ? (
        <>
          {Header}
          <ActivityIndicator style={{ marginTop: 12 }} />
        </>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(s) => s.start}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 56 }}
          ListHeaderComponent={Header}
          ListFooterComponent={<View style={{ height: 24 }} />}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const disabled = item.available <= 0 || booking || hasNonCancelledOnDay;
            return (
              <TouchableOpacity
                style={[styles.slot, disabled && styles.slotDisabled]}
                onPress={() => onPressSlot(item)}
                disabled={disabled}
                activeOpacity={0.9}
              >
                <View style={styles.slotTopRow}>
                  <Ionicons name="time-outline" size={16} color="#0f172a" />
                  <Text style={styles.slotTime}>
                    {new Date(item.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Text style={styles.slotCap}>
                  {hasNonCancelledOnDay ? "Already booked that day" : item.available > 0 ? `${item.available} left` : "Full"}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#94a3b8", marginTop: 8, paddingHorizontal: 16 }}>
              No slots on this date.
            </Text>
          }
        />
      )}

      {/* Department dropdown modal — spacious, searchable, 2-column grid */}
      <Modal
        visible={deptPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeptPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDeptPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="business-outline" size={18} color="#0f172a" />
              <Text style={styles.modalTitle}>Select department</Text>
            </View>

            {loadingDepts ? (
              <ActivityIndicator />
            ) : departments.length === 0 ? (
              <View style={styles.emptyPill}>
                <Text style={styles.emptyPillText}>No departments</Text>
              </View>
            ) : (
              <>
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    value={deptQuery}
                    onChangeText={setDeptQuery}
                    placeholder="Search departments"
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                  />
                  {deptQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setDeptQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredDepts}
                  keyExtractor={(d) => String(d.id)}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 10 }}
                  contentContainerStyle={{ paddingTop: 6 }}
                  renderItem={({ item }) => {
                    const active = deptId === item.id;
                    return (
                      <TouchableOpacity
                        style={[styles.deptOptionCard, active && styles.deptOptionActive]}
                        onPress={() => {
                          setDeptId(item.id);
                          setDeptPickerOpen(false);
                          setDeptQuery("");
                        }}
                        activeOpacity={0.9}
                      >
                        <Text
                          style={[styles.deptOptionText, active && styles.deptOptionTextActive]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        {active ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#059669"
                            style={{ position: "absolute", top: 8, right: 8 }}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={[styles.emptyPill, { marginTop: 12 }]}>
                      <Text style={styles.emptyPillText}>No matches</Text>
                    </View>
                  }
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setDeptPickerOpen(false)}>
                <Text style={styles.btnGhostText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Native date picker modal */}
      {Platform.OS !== "web" && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={[styles.modalCard, { paddingTop: 12 }]} onPress={() => {}}>
              <Text style={styles.modalTitle}>Choose date</Text>
              <DateTimePicker
                mode="date"
                value={date}
                onChange={onPickDate}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
              {Platform.OS === "ios" && (
                <View style={{ alignItems: "flex-end", marginTop: 10 }}>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setShowPicker(false)}>
                    <Text style={styles.btnPrimaryText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Confirm modal */}
      <Modal visible={confirmOpen} animationType="fade" transparent onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar-outline" size={18} color="#0f172a" />
              <Text style={styles.modalTitle}>Confirm booking</Text>
            </View>

            <Text style={styles.modalBody}>
              Service: <Text style={styles.boldText}>{selService?.name}</Text>
            </Text>
            <Text style={styles.modalBody}>
              When:{" "}
              <Text style={styles.boldText}>
                {pendingSlot
                  ? `${new Date(pendingSlot.start).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })} • ${new Date(pendingSlot.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </Text>
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setConfirmOpen(false)} disabled={booking}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={doBook} disabled={booking}>
                <Text style={styles.btnPrimaryText}>{booking ? "Booking..." : "Book now"}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8fb" },

  // Top bar
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "left", fontSize: 20, fontWeight: "900", color: "#0f172a" },
  headerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  headerLinkText: { color: "#2563eb", fontWeight: "800" },

  // Section container
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 12,
  },

  // Step header
  stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  stepIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF", // overridden by tone
    borderWidth: 1,
    borderColor: "#DBEAFE",     // overridden by tone
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { marginLeft: 10, fontWeight: "900", color: "#0f172a", fontSize: 16 },

  // Department form field
  formLabel: { color: "#6b7280", fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 2 },
  fieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fieldValue: { color: "#0f172a", fontWeight: "800", flex: 1, marginRight: 10 },
  fieldPlaceholder: { color: "#94a3b8" },
  helperText: { marginTop: 8, color: "#64748b", fontWeight: "600", fontSize: 12 },

  // Scroll cue (services)
  scrollCue: {
    position: "absolute",
    right: 4,
    top: "40%",
    backgroundColor: "rgba(248,250,252,0.95)",
    borderRadius: 999,
    padding: 6,
  },

  // Service cards
  svcCard: {
    width: 220,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  svcCardActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  svcIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  svcName: { fontWeight: "900", color: "#0f172a", fontSize: 14 },
  svcNameActive: { color: "#fff" },
  svcMeta: { color: "#64748b", marginTop: 4, fontSize: 12 },
  svcMetaActive: { color: "#bfdbfe" },

  // Date button
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  dateText: { color: "#1e40af", marginLeft: 6, fontWeight: "800" },

  // Quick chips
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  quickChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickChipPrimary: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  quickChipText: { color: "#0f172a", fontWeight: "700" },
  quickChipTextPrimary: { color: "#fff", fontWeight: "800" },

  // Notes & empty pill
  infoNote: {
    marginTop: 12,
    marginHorizontal: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoNoteText: { color: "#0f172a", fontWeight: "600" },
  emptyPill: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPillText: { color: "#64748b", fontWeight: "700" },

  // Grid title
  gridTitle: { marginTop: 18, marginLeft: 4, marginBottom: 8, fontWeight: "900", color: "#0f172a", fontSize: 15 },

  // Slots
  slot: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    width: "48%",
  },
  slotTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  slotTime: { color: "#0f172a", fontWeight: "900", fontSize: 16 },
  slotCap: { color: "#64748b", fontWeight: "600" },
  slotDisabled: { opacity: 0.5 },

  // Modals (shared)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  modalBody: { color: "#0f172a", marginTop: 8, fontSize: 14 },
  boldText: { fontWeight: "900", color: "#0f172a" },
  modalActions: { marginTop: 16, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnGhost: { backgroundColor: "#F1F5F9" },
  btnGhostText: { color: "#0f172a", fontWeight: "900" },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  // Dept picker search + grid
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 4,
    color: "#0f172a",
    fontWeight: "700",
  },
  deptOptionCard: {
    flex: 1,
    minHeight: 68,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    justifyContent: "center",
  },
  deptOptionActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
  },
  deptOptionText: { color: "#0f172a", fontWeight: "800" },
  deptOptionTextActive: { color: "#065F46" },
});
