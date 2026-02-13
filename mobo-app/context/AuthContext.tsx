import React, { createContext, useState, ReactNode, useEffect } from "react";
import { login, logout } from "../services/auth";
import { getToken } from "../storage/secureStore";
import client from "../services/api";

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoading: false,
  userToken: null,
  signIn: async () => {},
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      setIsLoading(true);
      const token = await getToken();
      if (token) {
        try {
          await client.get("/users/me");
          setUserToken(token);
        } catch {
          setUserToken(null);
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
    } catch {
      alert("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await logout();
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
