// src/screens/LoginScreen.tsx
import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { register as registerService } from "../services/auth";

type LoginData = { email: string; password: string };
type RegisterData = { name: string; email: string; password: string; confirmPassword: string; phone?: string };

export default function LoginScreen() {
  const { control, handleSubmit, reset } = useForm<LoginData>({ defaultValues: { email: "", password: "" } });
  const { control: regControl, handleSubmit: regHandleSubmit, reset: regReset, watch: regWatch } = useForm<RegisterData>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", phone: "" },
  });

  const navigation = useNavigation<any>();
  const { signIn, isLoading } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [posting, setPosting] = useState(false);

  const passwordValue = regWatch("password", "");

  // Login
  const onLogin = async (data: LoginData) => { try { await signIn(data.email.trim(), data.password); } catch (err: any) { Alert.alert("Login failed", err?.message || "Unable to sign in"); } };

  // Register
  const onRegister = async (data: RegisterData) => {
    if (data.password !== data.confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    setPosting(true);
    try {
      await registerService(data.name.trim(), data.email.trim(), data.password, data.phone?.trim(), "user");
      await signIn(data.email.trim(), data.password);
      regReset();
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Registration failed";
      Alert.alert("Registration failed", String(msg));
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.card}>
            <Text style={styles.title}>Mobo</Text>
            <Text style={styles.subtitle}>{mode === "login" ? "Sign in to continue" : "Create an account"}</Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => { setMode("login"); regReset(); }} style={[styles.toggleBtn, mode === "login" ? styles.toggleActive : undefined]}>
                <Text style={[styles.toggleText, mode === "login" ? styles.toggleTextActive : undefined]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMode("register"); reset(); }} style={[styles.toggleBtn, mode === "register" ? styles.toggleActive : undefined]}>
                <Text style={[styles.toggleText, mode === "register" ? styles.toggleTextActive : undefined]}>Create account</Text>
              </TouchableOpacity>
            </View>

            {mode === "login" ? (
              <>
                <Controller
                  control={control}
                  name="email"
                  rules={{ required: "Email is required" }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={value} onChangeText={onChange} />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  rules={{ required: "Password required" }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Password" secureTextEntry value={value} onChangeText={onChange} />
                  )}
                />

                <TouchableOpacity style={styles.button} onPress={handleSubmit(onLogin)}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ marginBottom: 12 }}>
                  <Controller
                    control={regControl}
                    name="name"
                    rules={{ required: "Full name required" }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Full name"
                        value={value}
                        onChangeText={onChange}
                      />
                    )}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Controller
                    control={regControl}
                    name="email"
                    rules={{ required: "Email required" }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        autoCapitalize="none"
                        value={value}
                        onChangeText={onChange}
                      />
                    )}
                  />
                </View>

                <Controller control={regControl} name="password" rules={{ required: "Password required" }} render={({ field: { onChange, value } }) => <TextInput style={styles.input} placeholder="Password" secureTextEntry value={value} onChangeText={onChange} />} />
                <Controller control={regControl} name="confirmPassword" rules={{ required: "Confirm password", validate: (v) => v === passwordValue || "Passwords do not match" }} render={({ field: { onChange, value } }) => <TextInput style={styles.input} placeholder="Confirm password" secureTextEntry value={value} onChangeText={onChange} />} />
                <Controller control={regControl} name="phone" render={({ field: { onChange, value } }) => <TextInput style={styles.input} placeholder="Phone (optional)" keyboardType="phone-pad" value={value} onChangeText={onChange} />} />

                <TouchableOpacity style={styles.button} onPress={regHandleSubmit(onRegister)}>
                  {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
                </TouchableOpacity>
              </>
            )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 16, backgroundColor: "#eaf6ff" },
  card: { backgroundColor: "#fff", padding: 22, borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  toggleRow: { flexDirection: "row", alignSelf: "center", marginBottom: 12, backgroundColor: "#f1f5f9", borderRadius: 12 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 12 },
  toggleActive: { backgroundColor: "#0284c7" },
  toggleText: { color: "#334155", fontWeight: "700" },
  toggleTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#e6eef8", borderRadius: 12, padding: 12, marginBottom: 10, color: "#0f172a", fontSize: 14 },
  button: { backgroundColor: "#0284c7", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backBtn: { position: "absolute", top: 50, left: 16, zIndex: 10, padding: 8 },
});
