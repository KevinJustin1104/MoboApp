// mobo-app/services/api.ts
import axios from "axios";
import { getToken } from "../storage/secureStore";

export const API_BASE = "http://127.0.0.1:8000/api/v1";

const client = axios.create({ baseURL: API_BASE, timeout: 20000 });

// Attach token automatically
client.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

export default client;
