// src/components/BackHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type Props = { title: string; right?: React.ReactNode };

export default function BackHeader({ title, right }: Props) {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack?.() ?? false;
  return (
    <View style={styles.header}>
      {canGoBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1e293b" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1e293b" },
  headerAction: { width: 36, justifyContent: "center", alignItems: "center" },
});
