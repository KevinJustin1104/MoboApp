import client from "./api";

export type AppointmentService = {
  id: number;
  department_id: number;
  name: string;
  description?: string | null;
  duration_min: number;
  capacity_per_slot: number;
  is_active: boolean;
};

export type Slot = {
  start: string; // ISO
  end: string;   // ISO
  capacity: number;
  available: number;
};

export type Appointment = {
  id: string;
  user_id: string;
  service_id: number;
  department_id: number;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: "booked" | "cancelled" | "checked_in" | "serving" | "done" | "no_show";
  notes?: string | null;
  queue_number?: number | null;
  queue_date?: string | null;
  window_id?: number | null;
  qr_token: string;
  created_at: string;
  updated_at: string;
};

export type QueueNow = {
  department_id: number;
  date: string;
  now_serving?: number | null;
  waiting: number;
  average_wait_min?: number | null;
};

// ---------- Types ----------
export type AdminServiceCreate = {
  name: string;
  department_id: number;
  description?: string | null;
  duration_min: number;
  capacity_per_slot: number;
  is_active: boolean;
};

export type AdminService = AdminServiceCreate & { id: number };

export type AdminScheduleCreateInput = {
  service_id: number;
  day_of_week: number;   // 0..6
  start_time: string;    // "08:00"
  end_time: string;      // "17:00"
  slot_minutes?: number | null;
  capacity_per_slot?: number | null;
  valid_from?: string | null;   // "YYYY-MM-DD"
  valid_to?: string | null;
  timezone?: string | null;
};

export type AdminScheduleOut = AdminScheduleCreateInput & {
  id: number;
  // created_at?: string;
  // updated_at?: string;
};
export function toLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---------- Calls ----------

export async function listAdminSchedules(department_id?: number, service_id?: number) {
  const res = await client.get<AdminScheduleOut[]>("/admin_appointments/schedules", {
    params: { department_id, service_id },
  });
  return res.data;
}


export async function postAdminService(payload: AdminServiceCreate) {
  const res = await client.post<AdminService>("/admin_appointments/services", payload);
  return res.data;
}

export async function postAdminSchedules(items: AdminScheduleCreateInput[]) {
  const res = await client.post<AdminScheduleOut[]>("/admin_appointments/schedules", items);
  return res.data;
}
export async function listServices(department_id?: number) {
  const res = await client.get<AppointmentService[]>("/appointments/services", { params: { department_id } });
  return res.data;
}

export async function getSlots(service_id: number, dayYMD: string) {
  const res = await client.get<Slot[]>(
    `/appointments/services/${service_id}/slots`,
    { params: { day: dayYMD } }
  );
  return res.data;
}


export async function myCurrentAppointment() {
  try {
    const res = await client.get<Appointment | null>("/appointments/me/current");
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function bookAppointment(service_id: number, slot_start: string, notes?: string) {
  const res = await client.post<Appointment>("/appointments", { service_id, slot_start, notes });
  return res.data;
}

export async function myAppointments() {
  const res = await client.get<Appointment[]>("/appointments/me");
  return res.data;
}

export async function cancelAppointment(id: string) {
  const res = await client.post(`/appointments/${id}/cancel`, {});
  return res.data;
}

export async function queueNow(department_id: number) {
  const res = await client.get<QueueNow>("/appointments/queue/now", { params: { department_id }});
  return res.data;
}

export async function checkinAppointment(id: string, qr_token: string) {
  const res = await client.post(`/appointments/${id}/checkin`, { qr_token });
  return res.data; // QueueTicket
}