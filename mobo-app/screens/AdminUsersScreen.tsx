// src/screens/AdminUsersScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  joinedAt?: string;
};

type Nav = NativeStackNavigationProp<RootStackParamList, "AdminUsers">;

export default function AdminUsersScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>(
    Array.from({ length: 400 }).map((_, i) => ({
      id: `U${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      phone: `09${(100000000 + i).toString().slice(-9)}`,
      address: `Barangay ${1 + (i % 20)}, Mobo`,
      joinedAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
  );

  const [selected, setSelected] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity style={styles.viewBtn} onPress={() => setSelected(item)}>
        <Ionicons name="eye-outline" size={18} color="#0369a1" />
        <Text style={styles.viewText}>View</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Users</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        <TextInput placeholder="Search users by name or email" value={query} onChangeText={setQuery} style={styles.search} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 18, paddingBottom: 90 }}
        initialNumToRender={12}
        windowSize={11}
        removeClippedSubviews={true}
      />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <ScrollView style={styles.modalScreen} contentContainerStyle={{ padding: 18 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelected(null)} style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
              <Text style={{ marginLeft: 8 }}>Back</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: 18 }}>User Detail</Text>
            <View style={{ width: 40 }} />
          </View>

          {selected && (
            <>
              <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>{selected.name}</Text>
              <Text style={{ color: "#64748b", marginTop: 6 }}>{selected.email}</Text>
              <Text style={{ color: "#64748b", marginTop: 6 }}>Phone: {selected.phone}</Text>
              <Text style={{ color: "#64748b", marginTop: 6 }}>Address: {selected.address}</Text>
              <Text style={{ color: "#64748b", marginTop: 6 }}>Joined: {new Date(selected.joinedAt || "").toLocaleDateString()}</Text>

              {/* add any admin actions here (suspend, message, etc.) */}
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { flexDirection: "row", alignItems: "center", padding: 18 },
  back: { flexDirection: "row", alignItems: "center", width: 90 },
  backText: { marginLeft: 6, color: "#0f172a" },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#0f172a" },

  search: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e6eef6" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  userName: { fontWeight: "700", fontSize: 15, color: "#0f172a" },
  userEmail: { color: "#64748b", marginTop: 6 },

  viewBtn: { flexDirection: "row", alignItems: "center", gap: 6 as any, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#e6eef6" },
  viewText: { marginLeft: 8, color: "#0369a1", fontWeight: "700" },

  modalScreen: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
});
