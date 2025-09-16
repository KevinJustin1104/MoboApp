
import React, { useState, type CSSProperties } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

let RNDateTimePicker: any = null;
try {
  RNDateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  RNDateTimePicker = null;
}

const two = (n: number) => String(n).padStart(2, "0");

// ----- TIME helpers (HH:MM) -----
const timeToDate = (hhmm?: string) => {
  const d = new Date();
  if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
    const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(8, 0, 0, 0);
  }
  return d;
};
const dateToTime = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;

// ----- DATE helpers (YYYY-MM-DD) -----
const ymdToDate = (ymd?: string) => {
  const d = new Date();
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, da] = ymd.split("-").map((x) => parseInt(x, 10));
    d.setFullYear(y, m - 1, da);
    d.setHours(0, 0, 0, 0);
  }
  return d;
};
const dateToYMD = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

type FieldProps = {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

// -------- TIME FIELD (input type="time" on web) --------
export function FormTime({ value = "", onChange, placeholder = "HH:MM", disabled }: FieldProps) {
  const [open, setOpen] = useState(false);

  // WEB: real <input type="time">
  if (Platform.OS === "web") {
    const webInputStyle: CSSProperties = {
      width: "100%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#e2e8f0",
      borderRadius: 10,
      padding: 12,
      backgroundColor: "#fff",
      height: 44,
      boxSizing: "border-box",
      color: value ? "#0f172a" : "#94a3b8",
      fontWeight: 600 as any,
    };
    return (
      <View>
        {/* @ts-ignore: DOM element on web */}
        <input
          type="time"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          style={webInputStyle}
        />
      </View>
    );
  }

  // NATIVE with picker
  if (!RNDateTimePicker) {
    // Fallback: plain input
    return (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        editable={!disabled}
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.select}
        activeOpacity={0.8}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.selectText : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={18} color="#64748b" />
      </TouchableOpacity>

      {open && (
        <RNDateTimePicker
          mode="time"
          value={timeToDate(value)}
          onChange={(_:any, d?: Date) => {
            setOpen(false);
            if (d) onChange(dateToTime(d));
          }}
          display={Platform.OS === "ios" ? "spinner" : "default"}
        />
      )}
    </>
  );
}

// -------- DATE FIELD (input type="date" on web) --------
export function FormDate({ value = "", onChange, placeholder = "YYYY-MM-DD", disabled }: FieldProps) {
  const [open, setOpen] = useState(false);

  // WEB: real <input type="date">
  if (Platform.OS === "web") {
    const webInputStyle: CSSProperties = {
      width: "100%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#e2e8f0",
      borderRadius: 10,
      padding: 12,
      backgroundColor: "#fff",
      height: 44,
      boxSizing: "border-box",
      color: value ? "#0f172a" : "#94a3b8",
      fontWeight: 600 as any,
    };
    return (
      <View>
        {/* @ts-ignore: DOM element on web */}
        <input
          type="date"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          style={webInputStyle}
        />
      </View>
    );
  }

  // NATIVE with picker
  if (!RNDateTimePicker) {
    // Fallback: plain input
    return (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.select}
        activeOpacity={0.8}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.selectText : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </TouchableOpacity>

      {open && (
        <RNDateTimePicker
          mode="date"
          value={ymdToDate(value)}
          onChange={(_:any, d?: Date) => {
            setOpen(false);
            if (d) onChange(dateToYMD(d));
          }}
          display={Platform.OS === "ios" ? "spinner" : "default"}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // match your “select” look
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 6,
    marginBottom: 2,
  },
  selectPlaceholder: { color: "#94a3b8" },
  selectText: { color: "#0f172a", fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
});
