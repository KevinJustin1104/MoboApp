// src/screens/IncidentReportScreen.tsx
import React, { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { getIncidentCategories } from "../services/incidentsCategory"; // implement this API service
import { createIncidentForm } from "../services/incidents"; // multipart upload service (below)
import SuccessMessage from "../components/SuccessMessage";
import * as ImagePicker from "expo-image-picker";

type ImageItem = { id: string; uri: string };
type Category = { id: number; name: string; department_id?: number; department_name?: string; description?: string };
/** helper: convert remote/local uri -> File (browser) */
async function uriToFileWeb(uri: string, name: string, type = "image/jpeg"): Promise<File> {
  // fetch the resource, convert to blob, create File
  const res = await fetch(uri);
  const blob = await res.blob();
  // Some environments (Expo web) may give blobs without correct type; try to use provided type.
  const finalType = blob.type || type;
  return new File([blob], name, { type: finalType });
}

/** helper: create a "file-like" object for RN native */
function makeRNFileObject(uri: string, name: string, type = "image/jpeg") {
  return {
    uri,
    name,
    type,
  } as any;
}
export default function IncidentReportScreen() {
  const navigation = useNavigation<any>();
  const { userToken } = useContext(AuthContext);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [address, setAddress] = useState("");
  const [purok, setPurok] = useState("");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    Animated.timing(loaderOpacity, {
      toValue: isSubmitting ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isSubmitting]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getIncidentCategories();
        // expecting categories with shape { id, name, department_id, department_name, description }
        setCategories(
          (cats ?? []).map((cat: any) => ({
            ...cat,
            department_name: cat.department_name ?? undefined,
          }))
        );
      } catch (err) {
        console.warn("Failed to load categories", err);
      }
    })();
  }, []);

  // ---------- Image picking & camera ----------
  const addImage = (uri: string) => {
    setImages((prev) => [...prev, { id: String(Date.now()) + prev.length, uri }]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((p) => p.id !== id));
  };

  const pickImage = async () => {
    try {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm.status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access to pick images.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if ((res as any).cancelled) return;
      const uri = (res as any).uri ?? (res as any).assets?.[0]?.uri;
      if (uri) addImage(uri);
    } catch (err:any) {
      console.warn(err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const takePhoto = async () => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (camPerm.status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to take photos.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if ((res as any).cancelled) return;
      const uri = (res as any).uri ?? (res as any).assets?.[0]?.uri;
      if (uri) addImage(uri);
    } catch (err:any) {
      console.warn(err);
      Alert.alert("Error", "Could not open camera.");
    }
  };

  const useCurrentLocation = async () => {
    try {
      // you can integrate location API here: simplified placeholder
      setAddress("Barangay 1, Mobo, Masbate");
      setBarangay("Barangay 1");
    } catch (err:any) {
      console.warn(err);
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const validateForm = () => {
    if (!title.trim()) { Alert.alert("Validation", "Please enter a short title."); return false; }
    if (!selectedCategory) { Alert.alert("Validation", "Please choose a category."); return false; }
    if (!description.trim()) { Alert.alert("Validation", "Please provide a description."); return false; }
    // address can be optional if purok/barangay provided - but we'll require barangay at least
    if (!barangay.trim() && !address.trim()) { Alert.alert("Validation", "Please provide barangay or address."); return false; }
    return true;
  };




const handleSubmit = async () => {
  if (!validateForm()) return;
  setIsSubmitting(true);

  try {
    const form = new FormData();
    form.append("title", title);
    form.append("type", String(selectedCategory!.id));
    form.append("description", description);
    form.append("address", address || `${street} ${barangay} ${landmark}`.trim());
    form.append("purok", purok ?? "");
    form.append("barangay", barangay ?? "");
    form.append("street", street ?? "");
    form.append("landmark", landmark ?? "");
    if (selectedCategory?.department_id != null) {
      form.append("department_id", String(selectedCategory.department_id));
    }

    // Append images correctly per platform
    if (images.length) {
      if (Platform.OS === "web") {
            for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const name = `photo_${Date.now()}_${i}.jpg`;
            const file = await uriToFileWeb(img.uri, name, "image/jpeg");
            form.append("files", file, name); // <-- third argument is filename
            }
      } else {
        // React Native (iOS / Android): append RN file objects
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const name = `photo_${Date.now()}_${i}.jpg`;
            form.append("files", makeRNFileObject(img.uri, name, "image/jpeg")); // make sure file object has name
            }
      }
    }

    // DEBUG: inspect FormData internals (temporary)
    // RN: form._parts ; Web: can't inspect easily but you can log entries
    try {
      // @ts-ignore
      if (Platform.OS !== "web") console.log("Form parts (RN) _parts:", form._parts);
      // on web you can iterate FormData entries:
      else {
        // build a quick preview of form entries (web only)
        const preview: any[] = [];
        for (const pair of (form as any).entries()) {
          const [k, v] = pair;
          preview.push({ key: k, type: typeof v, isFile: v instanceof File, name: v?.name ?? null });
        }
        console.log("FormData preview (web):", preview);
      }
    } catch (e) {
      // ignore debug errors
    }

    // send multipart form
    await createIncidentForm(form);

    // reset form UI
    setTitle("");
    setDescription("");
    setSelectedCategory(null);
    setAddress("");
    setPurok("");
    setBarangay("");
    setStreet("");
    setLandmark("");
    setImages([]);
    setIsSubmitting(false);
    setSuccessVisible(true);
  } catch (err: any) {
    console.warn("Incident submission error", err);
    setIsSubmitting(false);
    Alert.alert("Error", err?.message || "Failed to submit incident");
  }
};

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.select} onPress={() => setTypeModalVisible(true)}>
          <View>
            <Text style={[styles.selectText, !selectedCategory && styles.placeholderText]}>
              {selectedCategory ? `${selectedCategory.name}` : "Choose category"}
            </Text>
            {selectedCategory?.department_name ? (
              <Text style={{ color: "#64748b", marginTop: 4, fontSize: 12 }}>{selectedCategory.department_name}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Short title</Text>
        <TextInput style={styles.input} placeholder="e.g. Fallen tree blocking road" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Detailed description</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="Describe what happened..." value={description} onChangeText={setDescription} multiline />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Barangay</Text>
            <TextInput style={styles.input} placeholder="e.g. Barangay 1" value={barangay} onChangeText={setBarangay} />
          </View>
          <TouchableOpacity style={styles.locBtn} onPress={useCurrentLocation}>
            <Ionicons name="locate-outline" size={20} color="#fff" />
            <Text style={styles.locBtnText}>Use location</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Purok</Text>
        <TextInput style={styles.input} placeholder="Purok / Sitio (optional)" value={purok} onChangeText={setPurok} />

        <Text style={styles.label}>Street / Number</Text>
        <TextInput style={styles.input} placeholder="Street, house no." value={street} onChangeText={setStreet} />

        <Text style={styles.label}>Landmark</Text>
        <TextInput style={styles.input} placeholder="Nearby landmark (optional)" value={landmark} onChangeText={setLandmark} />

        <Text style={styles.label}>Address (optional)</Text>
        <TextInput style={styles.input} placeholder="Full address (optional)" value={address} onChangeText={setAddress} />

        <Text style={styles.label}>Photos (optional)</Text>
        <View style={styles.photosRow}>
          <FlatList
            data={images}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.photoThumbWrapper}>
                <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeImage(item.id)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity style={styles.photoAddBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={20} color="#1e40af" />
                  <Text style={styles.photoAddText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoAddBtn, { marginLeft: 8 }]} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={20} color="#1e40af" />
                  <Text style={styles.photoAddText}>Camera</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.submitText}>{isSubmitting ? "Submitting..." : "Submit Report"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {isSubmitting && (
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", opacity: loaderOpacity, zIndex: 9999 }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 12, fontWeight: "700" }}>Submitting report...</Text>
        </Animated.View>
      )}

      <SuccessMessage visible={successVisible} message="Your report has been submitted successfully!" onClose={() => { setSuccessVisible(false); navigation.navigate("Home"); }} />

      <Modal visible={typeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose category</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {categories.map((c) => (
                <Pressable key={c.id} style={[styles.modalItem, selectedCategory?.id === c.id && styles.modalItemActive]} onPress={() => { setSelectedCategory(c); setTypeModalVisible(false); }}>
                  <Text style={[styles.modalItemText, selectedCategory?.id === c.id && styles.modalItemTextActive]}>{c.name}</Text>
                  {c.department_name ? <Text style={{ color: "#64748b", marginTop: 4, fontSize: 12 }}>{c.department_name}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setTypeModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* your styles kept largely the same — reuse what you had, omitted here for brevity */
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: { flexDirection: "row", alignItems: "center", marginTop: Platform.OS === "ios" ? 48 : 20, paddingHorizontal: 16, marginBottom: 8 },
  backBtn: { width: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#0f172a" },
  scroll: { padding: 16, paddingBottom: 36 },
  label: { color: "#374151", fontWeight: "700", marginBottom: 8 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#e6e9ef" },
  selectText: { fontSize: 14 },
  placeholderText: { color: "#9ca3af" },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e6e9ef", marginBottom: 12 },
  textarea: { minHeight: 110, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 as any },
  locBtn: { marginLeft: 8, backgroundColor: "#1e40af", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  locBtnText: { color: "#fff", fontSize: 12, marginTop: 2 },
  photosRow: { marginBottom: 12 },
  photoThumbWrapper: { marginRight: 12, position: "relative" },
  photoThumb: { width: 110, height: 80, borderRadius: 8, backgroundColor: "#eee" },
  removePhotoBtn: { position: "absolute", top: 6, right: 6, backgroundColor: "#ef4444", width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  photoAddBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: "#e6e9ef", backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  photoAddText: { color: "#1e40af", fontSize: 12, marginTop: 6 },
  submitBtn: { backgroundColor: "#ef4444", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 6 },
  submitText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalItem: { paddingVertical: 12 },
  modalItemActive: { backgroundColor: "#eef2ff", borderRadius: 8 },
  modalItemText: { fontSize: 15 },
  modalItemTextActive: { color: "#1e40af", fontWeight: "700" },
  modalClose: { alignItems: "center", marginTop: 8, paddingVertical: 12 },
  modalCloseText: { color: "#6b7280" },
});
