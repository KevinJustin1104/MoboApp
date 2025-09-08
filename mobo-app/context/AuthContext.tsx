import React, { createContext, useState, ReactNode, useEffect } from "react"; 
import { login, logout } from "../services/auth"; 
import { getToken } from "../storage/secureStore"; 
import client from "../services/api"; 
type AuthContextType = { 
  isLoading: boolean; 
  userToken: string | null; 
  userRole: "admin" | "user" | "staff" | null; 
  signIn: (email: string, password: string) => Promise<void>; 
  signOut: () => void; 
}; 
export const AuthContext = createContext<AuthContextType>({ 
  isLoading: false, 
  userToken: null, 
  userRole: null, 
  signIn: async () => {}, 
  signOut: () => {}, 
}); 
export const AuthProvider = ({ children }: { children: ReactNode }) => { 
  const [isLoading, setIsLoading] = useState(false); 
  const [userToken, setUserToken] = useState<string | null>(null); 
  const [userRole, setUserRole] = useState<"admin" | "user" | "staff" | null>(null); 
  // Check if token exists on app start 
  useEffect(() => { 
    const loadToken = async () => { 
      setIsLoading(true); const token = await getToken(); 
      if (token) { 
        setUserToken(token); 
        // 🔎 Fetch user profile to get role 
        try { 
          const res = await client.get("/users/me"); 
          setUserRole(res.data.role?.name); 
        } catch { 
          // if token invalid, clear it 
          setUserToken(null); setUserRole(null); 
        } 
      } 
      setIsLoading(false); 
    }; 
    loadToken(); 
  }, []); 

const signIn = async (email: string, password: string) => { 
  try { 
    setIsLoading(true); 
    const { access_token } = await login(email, password); 
    setUserToken(access_token); 
    // fetch role from backend 
    const res = await client.get("/users/me"); 
    setUserRole(res.data.role?.name); 
  } catch (err) { 
    alert("Invalid email or password"); 
  } finally { 
    setIsLoading(false); 
  } 
}; 

const signOut = async () => { 
  await logout(); 
  setUserToken(null); 
  setUserRole(null); 
}; 
return ( 
<AuthContext.Provider value={{ isLoading, userToken, userRole, signIn, signOut }}>
   {children} 
   </AuthContext.Provider> 
   ); 
  };