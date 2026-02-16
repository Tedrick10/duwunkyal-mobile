import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalDataService } from "./local-data-service";

interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  isAdmin: boolean;
  photo_url?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirmation: string, name: string, phone?: string, photoUri?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_KEY = "@duwunkyal_logged_in";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const u = await LocalDataService.getStoredUser();
      setUser(u);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(_email: string, _password: string) {
    const u = await LocalDataService.login(_email, _password);
    await AsyncStorage.setItem(AUTH_KEY, "true");
    await LocalDataService.setStoredUser(u);
    setUser(u);
  }

  async function register(
    _email: string,
    _password: string,
    _passwordConfirmation: string,
    _name: string,
    _phone?: string,
    _photoUri?: string
  ) {
    const u = await LocalDataService.register(
      _email,
      _password,
      _passwordConfirmation,
      _name,
      _phone,
      _photoUri
    );
    await AsyncStorage.setItem(AUTH_KEY, "true");
    await LocalDataService.setStoredUser(u);
    setUser(u);
  }

  async function logout() {
    await AsyncStorage.removeItem(AUTH_KEY);
    await LocalDataService.setStoredUser(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
