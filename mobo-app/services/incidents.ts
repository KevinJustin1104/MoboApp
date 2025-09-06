// mobo-app/services/incidents.ts
import client from "./api";
import { getToken } from "../storage/secureStore";
const BASE = "http://127.0.0.1:8000/api/v1";

type IncidentCreatePayload = {
  title: string;
  description: string;
  incidentType: string;
  address: string;
  images?: string[]; // base64 or file URI
};

export interface IncidentCategory {
  id: number;
  name: string;
  department_id?: number;
  department_name?: string | null;
}

// Create a new incident

export const createIncidentForm = async (form: FormData) => {
  const token = await getToken(); // your secure store helper
  const res = await fetch(`${BASE}/incidents/create`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ? JSON.stringify(payload.detail) : `HTTP ${res.status}`);
  }
  return res.json();
};

// Get current user's incidents
export async function getMyIncidents() {
  const res = await client.get("/incidents/me");
  return res.data;
}

// Admin: get all incidents
export async function getAllIncidents() {
  const res = await client.get("/incidents/admin/all");
  return res.data;
}

// Admin: update incident status
export async function updateIncidentStatus(
  incident_id: string,
  new_status: string,
  comment: string,
  departmentId: number | null = null
) {
  const res = await client.put(`/incidents/admin/${incident_id}/status`, {
    new_status,
    comment,
    departmentId
  });
  return res.data;
}

export async function getIncident(incidentId: string) {
  console.log("Fetching incident with id", incidentId);
  const res = await client.get(`/incidents/${incidentId}`);
  return res.data;
}


/**
 * Admin namespace — convenience grouped exports
 *
 * Usage:
 *   import { Admin } from "mobo-app/services/incidents";
 *   await Admin.getAllIncidents();
 *   await Admin.updateIncidentStatus(id, "Resolved", "fixed by maintenance");
 *   await Admin.getIncident(id);
 */
export const Admin = {
  getAllIncidents,
  updateIncidentStatus,
  getIncident
};
