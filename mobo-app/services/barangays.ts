// src/services/barangays.ts
import client from "./api";

export type Barangay = {
  id: number;
  name: string;
  code?: string | null;
};

export async function getBarangays(q?: string): Promise<Barangay[]> {
  const res = await client.get("/barangays", { params: q ? { q } : undefined });
  return res.data;
}

export async function createBarangay(data: { name: string; code?: string | null }): Promise<Barangay> {
  const res = await client.post("/barangays", data);
  return res.data;
}

export async function updateBarangay(id: number, data: { name?: string; code?: string | null }): Promise<Barangay> {
  const res = await client.put(`/barangays/${id}`, data);
  return res.data;
}

export async function deleteBarangay(id: number): Promise<void> {
  await client.delete(`/barangays/${id}`);
}

export async function listBarangays(q?: string, limit = 200): Promise<Barangay[]> {
  const params: any = { limit };
  if (q && q.trim()) params.q = q.trim();

  // Try public endpoint first
  try {
    const res = await client.get("/barangays/public", { params });
    return res.data ?? [];
  } catch (_) {
    // Fallback to /barangays if /public isn't available
    const res = await client.get("/barangays", { params });
    return res.data ?? [];
  }
}