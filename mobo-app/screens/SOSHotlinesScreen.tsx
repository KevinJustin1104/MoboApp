import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import BackHeader from "../components/BackHeader";

const HOTLINES = [
  { name: "PNP – Mobo Police", phone: "166", fallback: "+639XXXXXXXXX" },
  { name: "BFP – Fire Station", phone: "", fallback: "+639XXXXXXXXX" },
  { name: "MDRRMO", phone: "", fallback: "+639XXXXXXXXX" },
  { name: "RHU / Ambulance", phone: "", fallback: "+639XXXXXXXXX" },
];

export default function SOSHotlinesScreen() {
  const { t } = useTranslation();

  const callNow = (phone: string, fallback?: string) => {
    const num = phone || fallback || "";
    if (!num) return;
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  const shareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Location permission denied.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const url = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
      Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Failed to get location.");
    }
  };

  return (
    <View style={styles.container}>
    <BackHeader title="SOS Hotline" />
      <View style={styles.header}><Text style={styles.headerTitle}>{t("sos.header")}</Text></View>
      <Text style={styles.note}>{t("sos.note")}</Text>

      {HOTLINES.map((h) => (
        <View key={h.name} style={styles.row}>
          <View style={styles.left}>
            <View style={styles.icon}><Ionicons name="call" size={18} color="#0369a1" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={styles.phone}>{h.phone || h.fallback}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#0369a1" }]} onPress={() => callNow(h.phone, h.fallback)}>
              <Ionicons name="call-outline" size={16} color="#fff" />
              <Text style={styles.btnText}> {t("sos.call")} </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#64748b" }]} onPress={shareLocation}>
              <Ionicons name="location-outline" size={16} color="#fff" />
              <Text style={styles.btnText}> {t("sos.shareLocation")} </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff", padding: 16 },
  header: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 } }),
  },
  headerTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  note: { color: "#475569", marginBottom: 12 },

  row: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  left: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#e6f2ff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  name: { fontWeight: "800", color: "#0f172a" },
  phone: { color: "#64748b", marginTop: 2 },

  actions: { flexDirection: "row", gap: 8 as any },
  btn: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
