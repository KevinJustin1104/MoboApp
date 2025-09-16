// src/components/SuccessMessage.tsx  (you can keep the name)
// Reusable feedback modal: success | error | info

import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Variant = "success" | "error" | "info";

type Props = {
  visible: boolean;
  message: string;
  variant?: Variant;           // default: "success"
  title?: string;              // default based on variant
  primaryLabel?: string;       // default: "OK"
  onClose?: () => void;        // callback on close
  secondaryLabel?: string;     // optional second button
  onSecondary?: () => void;
  autoCloseMs?: number;        // optional auto dismiss
  dismissableBackdrop?: boolean; // tap outside to close (default true)
};

export default function SuccessMessage({
  visible,
  message,
  variant = "success",
  title,
  primaryLabel,
  onClose,
  secondaryLabel,
  onSecondary,
  autoCloseMs,
  dismissableBackdrop = true,
}: Props) {
  useEffect(() => {
    if (!visible || !autoCloseMs) return;
    const t = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [visible, autoCloseMs, onClose]);

  const palette = getPalette(variant);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (dismissableBackdrop) onClose?.();
        }}
      >
        {/* stopPropagation for content */}
        <Pressable style={[styles.card, { borderColor: palette.border }]} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: palette.tint }]}>
            <Ionicons name={palette.icon} size={28} color={palette.iconColor} />
          </View>

          <Text style={[styles.title, { color: palette.text }]}>
            {title ?? defaultTitle(variant)}
          </Text>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.btnRow}>
            {secondaryLabel ? (
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: palette.primary }]}
                onPress={onSecondary}
              >
                <Text style={[styles.btnSecondaryText, { color: palette.primary }]}>
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: palette.primary }]}
              onPress={onClose}
            >
              <Text style={styles.btnPrimaryText}>{primaryLabel ?? "OK"}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function defaultTitle(v: Variant) {
  switch (v) {
    case "success":
      return "Success";
    case "error":
      return "Oops";
    case "info":
    default:
      return "Notice";
  }
}

function getPalette(variant: Variant) {
  if (variant === "error") {
    return {
      primary: "#dc2626",
      text: "#991b1b",
      border: "#fecaca",
      tint: "#fee2e2",
      icon: "close-circle-outline" as const,
      iconColor: "#dc2626",
    };
  }
  if (variant === "info") {
    return {
      primary: "#2563eb",
      text: "#1e3a8a",
      border: "#bfdbfe",
      tint: "#dbeafe",
      icon: "information-circle-outline" as const,
      iconColor: "#2563eb",
    };
  }
  // success
  return {
    primary: "#16a34a",
    text: "#14532d",
    border: "#bbf7d0",
    tint: "#dcfce7",
    icon: "checkmark-circle-outline" as const,
    iconColor: "#16a34a",
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  iconWrap: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  message: { fontSize: 15, textAlign: "center", color: "#334155", marginBottom: 14 },
  btnRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 as any },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  btnSecondaryText: { fontWeight: "800" },
});
