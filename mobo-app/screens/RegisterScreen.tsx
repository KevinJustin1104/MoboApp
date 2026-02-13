// mobo-app/screens/RegisterScreen.tsx
import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { register as registerService } from "../services/auth";
import { useNavigation } from "@react-navigation/native";

type FormData = { name: string; email: string; password: string; phone?: string };

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const user = await registerService(data.name.trim(), data.email.trim(), data.password, data.phone?.trim() || null, "user");
      Alert.alert("Registered", "Account created successfully. Please sign in.");
      navigation.navigate("Login");
    } catch (err: any) {
      console.warn(err);
      Alert.alert("Registration failed", (err?.response?.data?.detail) ? String(err.response.data.detail) : "Unable to register");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="#1e293b" />
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>

        <Controller
          control={control}
          name="name"
          rules={{ required: "Name is required" }}
          render={({ field: { value, onChange } }) => (
            <>
              <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Full name" value={value} onChangeText={onChange} />
              {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
            </>
          )}
        />

        <Controller
          control={control}
          name="email"
          rules={{ required: "Email required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } }}
          render={({ field: { value, onChange } }) => (
            <>
              <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Email" value={value} autoCapitalize="none" keyboardType="email-address" onChangeText={onChange} />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: "Password required", minLength: { value: 6, message: "Min 6 characters" } }}
          render={({ field: { value, onChange } }) => (
            <>
              <TextInput style={[styles.input, errors.password && styles.inputError]} placeholder="Password" secureTextEntry value={value} onChangeText={onChange} />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </>
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange } }) => (
            <TextInput style={styles.input} placeholder="Phone (optional)" value={value} onChangeText={onChange} keyboardType="phone-pad" />
          )}
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.navigate("Login")}>
          <Text style={{ color: "#0369a1", textAlign: "center" }}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f7ff", justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12, elevation: 3 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#e6eef8", padding: 12, borderRadius: 8, marginBottom: 8 },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginBottom: 8 },
  button: { backgroundColor: "#0284c7", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  backBtn: { position: "absolute", top: 50, left: 16, zIndex: 10, padding: 8 },
});
