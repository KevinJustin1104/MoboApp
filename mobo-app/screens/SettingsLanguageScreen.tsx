// src/screens/SettingsLanguageScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import BackHeader from "../components/BackHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

const langs = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
  { code: "bcl", label: "Bikol" },
];

const STORAGE_KEY = "app.lang";

export default function SettingsLanguageScreen() {
  const { i18n: i18next } = useTranslation();
  const [current, setCurrent] = useState(i18next.language);

  // Keep UI in sync if language changes elsewhere
  useEffect(() => {
    const onChange = (lng: string) => setCurrent(lng);
    i18next.on("languageChanged", onChange);
    return () => {
      i18next.off("languageChanged", onChange);
    };
  }, [i18next]);

  // Load persisted choice once
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && saved !== i18next.language) {
          await i18next.changeLanguage(saved);
        }
      } catch {}
    })();
  }, [i18next]);

  const change = useCallback(async (code: string) => {
    try {
      await i18n.changeLanguage(code);        // change
      await AsyncStorage.setItem(STORAGE_KEY, code); // persist (optional)
      // setCurrent will be triggered by the languageChanged event listener
    } catch (e) {
      console.warn("Failed to change language:", e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <BackHeader title="Language" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Language</Text>
      </View>

      {langs.map((l) => {
        const active = current?.startsWith(l.code); // handle en/en-US, etc.
        return (
          <TouchableOpacity
            key={l.code}
            style={[styles.row, active && styles.rowActive]}
            onPress={() => change(l.code)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityState={{ selected: !!active }}
            accessibilityLabel={`Switch to ${l.label}`}
          >
            <Text style={[styles.label, active && { color: "#0369a1" }]}>{l.label}</Text>
            {active ? <Ionicons name="checkmark" size={18} color="#0369a1" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff", padding: 16 },
  header: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },
  headerTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  rowActive: { borderWidth: 1, borderColor: "#cfe9ff" },
  label: { fontWeight: "800", color: "#0f172a" },
});
