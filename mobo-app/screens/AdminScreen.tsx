import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation";
import { AuthContext } from "../context/AuthContext";

type AdminScreenProp = NativeStackNavigationProp<RootStackParamList, "Admin">;

export default function AdminScreen() {
  const navigation = useNavigation<AdminScreenProp>();
  const { signOut } = useContext(AuthContext);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
      {/* Header */}
      <View style={styles.headerRow}>

        <Text style={styles.headerTitle}>Admin Dashboard</Text>

        <View style={styles.headerRight}>
            <TouchableOpacity
            onPress={async () => {
                await signOut();          // clear token and role
                navigation.reset({        // reset navigation stack to Login
                index: 0,
                routes: [{ name: "Login" }],
                });
            }}
            style={styles.iconBtn}
            >
            <Ionicons name="log-out-outline" size={22} color="#0f172a" />
            </TouchableOpacity>

        </View>
      </View>

      <Text style={styles.lead}>Manage incidents, announcements and users</Text>

      {/* Action cards */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("AdminIncidents")}
      >
        <View style={styles.cardRow}>
          <Ionicons name="document-text-outline" size={28} color="#0369a1" />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Incidents</Text>
            <Text style={styles.cardSubtitle}>View and update user-submitted incidents</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("AdminAnnouncements")}
      >
        <View style={styles.cardRow}>
          <Ionicons name="megaphone-outline" size={28} color="#065f46" />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Announcements</Text>
            <Text style={styles.cardSubtitle}>Post, edit, or delete public announcements</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("AdminUsers")}
      >
        <View style={styles.cardRow}>
          <Ionicons name="people-outline" size={28} color="#7c3aed" />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Users</Text>
            <Text style={styles.cardSubtitle}>Browse registered users and their details</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </View>
      </TouchableOpacity>

    <TouchableOpacity
    style={styles.card}
    activeOpacity={0.85}
    onPress={() => navigation.navigate("AdminDepartment")}
    >
    <View style={styles.cardRow}>
        <Ionicons name="business-outline" size={28} color="#7c3aed" />
          <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Departments</Text>
          <Text style={styles.cardSubtitle}>
              Browse all departments and their incident categories
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </View>
    </TouchableOpacity>

    <TouchableOpacity
    style={styles.card}
    activeOpacity={0.85}
    onPress={() => navigation.navigate("AdminCategoryIncidents")}
    >
    <View style={styles.cardRow}>
        <Ionicons name="alert-circle-outline" size={28} color="#0369a1" />
        <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>Incidents Category</Text>
        <Text style={styles.cardSubtitle}>
            View all incident categories linked to their departments
        </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("AdminCreateDepartmentStaff")}
    >
    <View style={styles.cardRow}>
        <Ionicons name="person-add-outline" size={28} color="#0369a1" />
        <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>Create Department Staff</Text>
        <Text style={styles.cardSubtitle}>
            Create new staff accounts for department management
        </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("AdminBarangays")}
    >
    <View style={styles.cardRow}>
        <Ionicons name="business-outline" size={28} color="#e6f2ff" />
        <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>Barangays</Text>
        <Text style={styles.cardSubtitle}>
            Manage barangays in the system
        </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </View>
    </TouchableOpacity>
 <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("AdminCreateAlert")}
    >
    <View style={styles.cardRow}>
        <Ionicons name="business-outline" size={28} color="#e6f2ff" />
        <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>Alert</Text>
        <Text style={styles.cardSubtitle}>
            Manage barangays in the system
        </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </View>
    </TouchableOpacity>
      {/* quick footer */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f8fb" },
  content: { padding: 18, paddingTop: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", width: 90 },
  headerBackText: { marginLeft: 6, color: "#0f172a", fontSize: 15 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#0f172a" },
  headerRight: { width: 40, alignItems: "flex-end" },
  iconBtn: { padding: 6, borderRadius: 8 },
  lead: { color: "#64748b", marginBottom: 16, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSubtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
});
