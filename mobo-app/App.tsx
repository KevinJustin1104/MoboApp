// App.tsx
import React, { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import RootNavigation from "./navigation";

import {
  registerForPushNotificationsAsync,
  startNotificationListeners,
  presentLocalGeneral,
  getUnreadCount, // from notifications.api (re-exported)
  unlockWebAudio, // web-only (no-op on native)
  requestWebNotificationPermission,
} from "./services/notifications";

import { startAlertsPolling } from "./services/alert";

export default function App() {
  useEffect(() => {
    // Web: unlock audio + ask permission on first gesture
    if (Platform.OS === "web") {
      const onFirst = async () => {
        try {
          unlockWebAudio(); // enable beep
          const perm = await requestWebNotificationPermission(); // ask nicely, on gesture
          console.log("[web] permission after gesture =", perm);
        } catch {}
        window.removeEventListener("click", onFirst);
        window.removeEventListener("keydown", onFirst as any);
        window.removeEventListener("touchstart", onFirst as any);
      };
      window.addEventListener("click", onFirst);
      window.addEventListener("keydown", onFirst as any);
      window.addEventListener("touchstart", onFirst as any);
    }

    // Register for push (also sets Android channels)
    (async () => {
      try {
        const res = await registerForPushNotificationsAsync();
        if ((res as any)?.token) {
          console.log("Expo push token:", (res as any).token);
          // TODO: send token to backend
        }
      } catch (e) {
        console.warn("[App] registerForPushNotificationsAsync failed", e);
      }
    })();

    // Foreground listeners (receive + tap)
    const unsubNotifications = startNotificationListeners({
      onReceive: (n: any) => {
        const content = n?.request?.content ?? n;
        console.log("[notif:foreground]", content);
      },
      onRespond: (r: any) => {
        const data = r?.notification?.request?.content?.data;
        console.log("[notif:tapped]", data);
      },
    });

    // Alerts poller (local notifs for new alerts; respects quiet hours and read state)
    const stopAlerts = startAlertsPolling({
      intervalMs: 30_000,
      applyPrefs: true,
      notify: true,
      onNew: (_items: any) => {
        // Optional: update in-app badge here
      },
    });

    // Server-side notifications unread count → local ping on increases only
    let lastUnread = -1; // -1 = uninitialized (prevents first-run beep)
    const tickServer = async () => {
      try {
        const count = await getUnreadCount();
        if (lastUnread === -1) {
          lastUnread = count; // baseline only; no beep
          return;
        }
        if (count > lastUnread) {
          await presentLocalGeneral({
            title: "New notifications",
            body: `You have ${count} unread.`,
            data: { type: "server" },
          });
        }
        // Always align baseline to server truth (so reads won't cause re-beep)
        lastUnread = count;
      } catch {
        // ignore network errors
      }
    };
    const serverTimer: any = setInterval(tickServer, 45_000);
    tickServer(); // immediate (no beep on first run)

    return () => {
      try { unsubNotifications?.(); } catch {}
      try { stopAlerts?.(); } catch {}
      try { clearInterval(serverTimer); } catch {}
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
