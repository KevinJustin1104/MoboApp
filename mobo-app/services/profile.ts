import client from "./api";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
};

export async function getProfile() {
  const res = await client.get<UserProfile>("/profile");
  return res.data;
}

export async function updateProfile(name: string) {
  const res = await client.put<UserProfile>("/profile", { name });
  return res.data;
}
