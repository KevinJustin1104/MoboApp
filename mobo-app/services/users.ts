// src/services/users.ts
import client from "./api";

export type MeProfile = {
  id: string;
  name: string;
  email: string;
  barangay_id?: number | null;
  barangay_name?: string; // if your backend returns a string name
  barangay?: { id: number; name: string; code?: string } | null; // if your backend nests it
};

/**
 * Fetch current user profile.
 * Tries /users/me first. Falls back to /auth/me if needed.
 */
export async function getMe(): Promise<MeProfile> {
  try {
    const { data } = await client.get("/users/me");
    return data;
  } catch {
    const { data } = await client.get("/auth/me");
    return data;
  }
}
