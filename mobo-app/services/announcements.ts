// src/services/announcements.ts
import client from "./api";
import { Platform } from "react-native";

export type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  image_url?: string | null;
  image_data_uri?: string | null;   // NEW
  created_at: string;
};
export type AnnouncementComment = {
  id: string;
  author_id?: string | null;
  author_name?: string | null; // NEW
  comment: string;
  created_at: string;
  parent_id?: string | null;
  replies?: AnnouncementComment[];
};


export async function getLatestAnnouncements(limit = 5) {
  const res = await client.get<Announcement[]>("/announcements/latest", { params: { limit } });
  return res.data ?? [];
}

export async function getAnnouncementById(id: string) {
  const res = await client.get<Announcement>(`/announcements/${id}`);
  return res.data;
}

/** Comments */
export async function getAnnouncementComments(announcementId: string) {
  const res = await client.get<AnnouncementComment[]>(`/announcements/${announcementId}/comments`);
  return res.data ?? [];
}

export async function postAnnouncementComment(announcementId: string, comment: string, parent_id?: string) {
  const res = await client.post<AnnouncementComment>(`/announcements/${announcementId}/comments`, {
    comment,
    parent_id,
  });
  return res.data;
}

/** Admin */
export async function createAnnouncement(payload: {
  title: string;
  body: string;
  image?: { uri: string; name?: string; type?: string } | null;
}) {
  const form = new FormData();
  form.append("title", payload.title ?? "");
  form.append("body", payload.body ?? "");

  if (payload.image?.uri) {
    if (Platform.OS === "web") {
      const resp = await fetch(payload.image.uri);
      const blob = await resp.blob();
      const fileName = payload.image.name ?? "image.jpg";
      form.append("file", blob, fileName);
    } else {
      // @ts-ignore – RN FormData file shape
      form.append("file", {
        uri: payload.image.uri,
        name: payload.image.name ?? "image.jpg",
        type: payload.image.type ?? "image/jpeg",
      });
    }
  }

  const res = await client.post("/announcements/", form);
  return res.data;
}

export async function updateAnnouncement(
  id: string,
  payload: {
    title?: string;
    body?: string;
    image?: { uri: string; name?: string; type?: string } | null;
  }
) {
  const form = new FormData();
  if (payload.title !== undefined) form.append("title", payload.title);
  if (payload.body !== undefined) form.append("body", payload.body);

  if (payload.image?.uri) {
    if (Platform.OS === "web") {
      const resp = await fetch(payload.image.uri);
      const blob = await resp.blob();
      const fileName = payload.image.name ?? "image.jpg";
      form.append("file", blob, fileName);
    } else {
      // @ts-ignore
      form.append("file", {
        uri: payload.image.uri,
        name: payload.image.name ?? "image.jpg",
        type: payload.image.type ?? "image/jpeg",
      });
    }
  }

  const res = await client.put(`/announcements/${id}`, form);
  return res.data;
}

export async function deleteAnnouncement(id: string) {
  await client.delete(`/announcements/${id}`);
  return true;
}