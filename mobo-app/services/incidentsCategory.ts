// mobo-app/services/incidentsCategory.ts
import client from "./api";

export interface IncidentCategory {
  id: number;
  name: string;
  department_id?: number | null;
  department_name?: string | null;
  urgency_level?: number | null;
}

// Fetch all incident categories
export const getIncidentCategories = async (): Promise<IncidentCategory[]> => {
  const res = await client.get("/incident_categories");
  return res.data;
};

// Create an incident category (now accepts urgency_level)
export const createIncidentCategory = async (
  name: string,
  department_id?: string | null,
  urgency_level?: number | null
): Promise<IncidentCategory> => {
  const res = await client.post("/incident_categories", { name, department_id, urgency_level });
  return res.data;
};

// Update an incident category
export const updateIncidentCategory = async (
  id: number,
  payload: { name?: string; department_id?: number | null; urgency_level?: number | null }
): Promise<IncidentCategory> => {
  const res = await client.put(`/incident_categories/${id}`, payload);
  return res.data;
};

// Delete an incident category
export const deleteIncidentCategory = async (id: number): Promise<void> => {
  await client.delete(`/incident_categories/${id}`);
};

/* Admin namespace convenience (optional) */
export const Admin = {
  getIncidentCategories,
  createIncidentCategory,
  updateIncidentCategory,
  deleteIncidentCategory,
};
