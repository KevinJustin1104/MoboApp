// src/screens/ServicesScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const SERVICE_CATEGORIES = [
  { id: "services", labelKey: "common.services", icon: "construct-outline", route: "BookAppointment" as const },
  { id: "citizen", labelKey: "common.citizenGuide", icon: "people-outline", route: "Announcements" as const },
  { id: "eservices", labelKey: "common.eServices", icon: "globe-outline", route: "BookAppointment" as const },
  { id: "emergency", labelKey: "common.emergency", icon: "warning-outline", route: "Alerts" as const },
  { id: "utilities", labelKey: "common.utilities", icon: "flash-outline", route: "BookAppointment" as const },
  { id: "transport", labelKey: "common.transport", icon: "bus-outline", route: "BookAppointment" as const },
  { id: "business", labelKey: "common.business", icon: "bar-chart-outline", route: "BookAppointment" as const },
];

export default function ServicesScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("common.services", "Services")}</Text>
        <Text style={styles.headerSubtitle}>{t("common.servicesSubtitle", "Browse and access local government services")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SERVICE_CATEGORIES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.card}
              onPress={() => navigation.navigate(s.route)}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={s.icon as any} size={28} color="#7c3aed" />
              </View>
              <Text style={styles.cardLabel}>{t(s.labelKey, s.id)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b" },
  headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 6 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
});
