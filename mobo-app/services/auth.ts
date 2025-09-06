// mobo-app/services/auth.ts
import client from "./api";
import { setToken, removeToken } from "../storage/secureStore";

type LoginResp = { access_token: string; token_type?: string };

// Login function
export async function login(email: string, password: string) {
  const params = new URLSearchParams();
  params.append("username", email); // must be `username` for FastAPI OAuth2PasswordRequestForm
  params.append("password", password);

  const res = await client.post<LoginResp>("/auth/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const token = res.data.access_token;
  await setToken(token); 
  return res.data;
}
// Register function
export async function register(
  name: string,
  email: string,
  password: string,
  phone: string | null = null,
  role: string = "user"
) {
  
  const res = await client.post("/auth/register", { name, email, password, phone, role });
  return res.data;
}

// Fetch current logged-in user
export async function fetchProfile() {
  const res = await client.get("/users/me"); // interceptor attaches token
  return res.data;
}

// Logout
export async function logout() {
  await removeToken();
}
