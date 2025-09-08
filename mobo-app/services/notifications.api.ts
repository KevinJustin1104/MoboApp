// src/services/notifications.api.ts
import client from "./api";

export type NotificationOut = {
  id: string;
  user_id: string;
  incident_id?: string | null;
  message?: string | null;
  read: boolean;
  created_at: string;
};

export async function listNotifications(): Promise<NotificationOut[]> {
  const res = await client.get<NotificationOut[]>("/notifications");
  return res.data ?? [];
}

export async function markNotificationRead(notificationId: string): Promise<NotificationOut> {
  const res = await client.post<NotificationOut>(`/notifications/${notificationId}/read`);
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await client.get<{ count: number }>("/notifications/unread_count");
  return res.data?.count ?? 0;
}
