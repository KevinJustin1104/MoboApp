// src/components/QueueNowBanner.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { userQueueNow, type QueueNow } from "../services/queue";

type Props = {
  departmentId: number;
  compact?: boolean; // smaller variant if needed
  pollMs?: number;   // default 10s
};

export default function QueueNowBanner({ departmentId, compact, pollMs = 10000 }: Props) {
  const [data, setData] = useState<QueueNow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await userQueueNow(departmentId);
      setData(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let stopped = false;
    setLoading(true);
    load();

    const id = setInterval(() => {
      if (!stopped) load();
    }, pollMs);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [departmentId, pollMs]);

  return (
    <View style={[styles.wrap, compact && { paddingVertical: 10 }]}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={18} color="#1e40af" />
        </View>
        <View>
          <Text style={styles.title}>Live Queue</Text>
          <Text style={styles.sub}>{`Dept #${departmentId}`}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : !data ? (
        <Text style={styles.sub}>Unavailable</Text>
      ) : (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Now Serving</Text>
            <Text style={styles.statValue}>{data.now_serving ?? "—"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Waiting</Text>
            <Text style={styles.statValue}>{data.waiting}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  left: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: { fontWeight: "800", color: "#0f172a" },
  sub: { color: "#64748b", marginTop: 2, fontSize: 12 },
  stats: { flexDirection: "row", alignItems: "center" },
  statItem: { alignItems: "center", marginHorizontal: 6 },
  statLabel: { color: "#64748b", fontSize: 11 },
  statValue: { color: "#0f172a", fontSize: 16, fontWeight: "800", marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: "#e5e7eb", marginHorizontal: 6 },
});
