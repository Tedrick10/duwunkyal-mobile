import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "./query-client";
import { LocalDataService } from "./local-data-service";
import { setOnUnauthorized } from "./on-unauthorized";

interface User {
  id: number;
  email: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  isAdmin: boolean;
  photo_url?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, passwordConfirmation: string, name: string, email?: string, address?: string, photoUri?: string) => Promise<void>;
  updateUser: (updates: { name?: string; email?: string; phone?: string; address?: string; password?: string; password_confirmation?: string; photoUri?: string }) => Promise<void>;
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

  useEffect(() => {
    setOnUnauthorized(async () => {
      await AsyncStorage.removeItem(AUTH_KEY);
      await LocalDataService.setStoredUser(null);
      await LocalDataService.setStoredToken(null);
      setUser(null);
      await queryClient.removeQueries({ queryKey: ["/api/wishlist"] });
      await queryClient.removeQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("/api/wishlist/check") });
      await queryClient.removeQueries({ queryKey: ["/api/cart"] });
      await queryClient.removeQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/orders" });
      await queryClient.removeQueries({ queryKey: ["/api/notifications"] });
      await queryClient.removeQueries({ queryKey: ["/api/notifications/unread-count"] });
    });
    return () => setOnUnauthorized(() => { });
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

  async function login(_phone: string, _password: string) {
    const u = await LocalDataService.login(_phone, _password);
    await AsyncStorage.setItem(AUTH_KEY, "true");
    await LocalDataService.setStoredUser(u);
    setUser(u);
    await queryClient.invalidateQueries({ queryKey: ["productList"] });
    await queryClient.invalidateQueries({ queryKey: ["featuredProductList"] });
    await queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("productListByCategory/") });
  }

  async function register(
    _phone: string,
    _password: string,
    _passwordConfirmation: string,
    _name: string,
    _email?: string,
    _address?: string,
    _photoUri?: string
  ) {
    const u = await LocalDataService.register(
      _phone,
      _password,
      _passwordConfirmation,
      _name,
      _email,
      _address,
      _photoUri
    );
    await AsyncStorage.setItem(AUTH_KEY, "true");
    await LocalDataService.setStoredUser(u);
    setUser(u);
    await queryClient.invalidateQueries({ queryKey: ["productList"] });
    await queryClient.invalidateQueries({ queryKey: ["featuredProductList"] });
    await queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("productListByCategory/") });
  }

  async function updateUser(updates: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    password_confirmation?: string;
    photoUri?: string;
  }) {
    const u = await LocalDataService.updateCustomer(updates);
    setUser(u);
  }

  async function logout() {
    await AsyncStorage.removeItem(AUTH_KEY);
    await LocalDataService.setStoredUser(null);
    await LocalDataService.setStoredToken(null);
    setUser(null);
    // Clear user-specific cache so next login shows fresh data
    await queryClient.removeQueries({ queryKey: ["/api/wishlist"] });
    await queryClient.removeQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("/api/wishlist/check") });
    await queryClient.removeQueries({ queryKey: ["/api/cart"] });
    await queryClient.removeQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/orders" });
    await queryClient.removeQueries({ queryKey: ["/api/notifications"] });
    await queryClient.removeQueries({ queryKey: ["/api/notifications/unread-count"] });
    await queryClient.invalidateQueries({ queryKey: ["productList"] });
    await queryClient.invalidateQueries({ queryKey: ["featuredProductList"] });
    await queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("productListByCategory/") });
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, updateUser, logout }),
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
