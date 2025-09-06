import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

type SuccessMessageProps = {
  visible: boolean;
  message: string;
  onClose?: () => void; // callback after closing
};

export default function SuccessMessage({ visible, message, onClose }: SuccessMessageProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Success</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (onClose) onClose();
            }}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  message: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  button: {
    backgroundColor: "#1e40af",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
