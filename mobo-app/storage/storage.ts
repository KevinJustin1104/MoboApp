// mobo-app/storage/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const setToken = async (token: string) => {
  try {
    await AsyncStorage.setItem("accessToken", token);
  } catch (e) {
    console.warn("Failed to set token", e);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("accessToken");
  } catch (e) {
    console.warn("Failed to get token", e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem("accessToken");
  } catch (e) {
    console.warn("Failed to remove token", e);
  }
};
