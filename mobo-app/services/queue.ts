// src/services/queue.ts
import client from "./api";

/** ---------- Types ---------- */
export type OfficeWindow = {
  id: number;
  department_id: number;
  name: string;
  is_open: boolean;
};

export type QueueTicket = {
  id: string;
  department_id: number;
  service_id: number | null;
  date: string;            // ISO datetime
  number: number;          // ticket number for the day
  appointment_id: string | null;
  window_id: number | null;
  status: "waiting" | "serving" | "done" | "no_show";
  created_at: string;      // ISO
  called_at: string | null;
  served_at: string | null;
};

export type QueueNow = {
  department_id: number;
  date: string;                 // ISO datetime
  now_serving: number | null;
  waiting: number;
  average_wait_min: number | null;
};

/** =========================================================
 *  ADMIN endpoints (require admin auth token)
 *  Base: /api/v1/officeWindow
 *  ======================================================= */

// Windows CRUD
export async function adminListWindows(
  department_id?: number
): Promise<OfficeWindow[]> {
  const res = await client.get<OfficeWindow[]>(
    "/officeWindow/queue/windows",
    { params: { department_id } }
  );
  return res.data;
}

export async function adminCreateWindow(
  department_id: number,
  name: string
): Promise<OfficeWindow> {
  const res = await client.post<OfficeWindow>(
    "/officeWindow/queue/windows",
    { department_id, name }
  );
  return res.data;
}

export async function adminUpdateWindow(
  id: number,
  patch: { name?: string; is_open?: boolean }
): Promise<OfficeWindow> {
  const res = await client.patch<OfficeWindow>(
    `/officeWindow/queue/windows/${id}`,
    patch
  );
  return res.data;
}

export async function adminDeleteWindow(id: number): Promise<void> {
  await client.delete(`/officeWindow/queue/windows/${id}`);
}

// Operate a window (open/close, call next) and close tickets (done/no_show)
export async function adminOpenWindow(id: number): Promise<{ ok: true }> {
  const res = await client.post<{ ok: true }>(
    `/officeWindow/queue/${id}/open`,
    {}
  );
  return res.data;
}

export async function adminCloseWindow(id: number): Promise<{ ok: true }> {
  const res = await client.post<{ ok: true }>(
    `/officeWindow/queue/${id}/close`,
    {}
  );
  return res.data;
}

export async function adminCallNext(window_id: number): Promise<QueueTicket> {
  const res = await client.post<QueueTicket>(
    `/officeWindow/queue/${window_id}/next`,
    {}
  );
  return res.data;
}

export async function adminTicketDone(ticket_id: string): Promise<QueueTicket> {
  const res = await client.post<QueueTicket>(
    `/officeWindow/queue/${ticket_id}/done`,
    {}
  );
  return res.data;
}

export async function adminTicketNoShow(
  ticket_id: string
): Promise<QueueTicket> {
  const res = await client.post<QueueTicket>(
    `/officeWindow/queue/${ticket_id}/no_show`,
    {}
  );
  return res.data;
}

/** =========================================================
 *  READ-ONLY (user/public) helpers used by admin UI for live status
 *  If you created explicit public routes, point to those instead.
 *  Below uses your existing endpoints:
 *   - GET /appointments/queue/now?department_id=...
 *   - GET /officeWindow/queue/windows/{id}/current
 *  ======================================================= */

export async function userQueueNow(
  department_id: number
): Promise<QueueNow> {
  const res = await client.get<QueueNow>("/appointments/queue/now", {
    params: { department_id },
  });
  return res.data;
}

export async function userCurrentForWindow(
  window_id: number
): Promise<QueueTicket | null> {
  // This endpoint returns either a ticket or null when nothing is being served.
  const res = await client.get<QueueTicket | null>(
    `/officeWindow/queue/windows/${window_id}/current`
  );
  return res.data;
}
