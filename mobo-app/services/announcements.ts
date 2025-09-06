// src/services/announcements.ts
import client from "./api";

export type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  image_url?: string | null;
  created_at: string;
};

export async function getLatestAnnouncements(limit = 5) {
  const res = await client.get<Announcement[]>("/announcements/latest", { params: { limit } });
  return res.data;
}

export async function getAnnouncementById(id: string) {
  const res = await client.get<Announcement>(`/announcements/${id}`);
  return res.data;
}
