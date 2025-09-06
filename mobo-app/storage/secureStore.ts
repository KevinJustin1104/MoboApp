// mobo-app/storage/secureStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "accessToken";

// Save token
export const setToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn("Failed to set token", e);
  }
};

// Get token
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to get token", e);
    return null;
  }
};

// Remove token
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to remove token", e);
  }
};
