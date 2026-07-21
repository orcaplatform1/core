"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { authStorage, type StoredUser } from "@/lib/auth-storage";

type RegisterPayload = {
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  gender: "ERKEK" | "KADIN";
};

type LoginPayload = {
  identifier: string;
  method: "username" | "email" | "phone";
  password: string;
};

type AuthResponse = {
  token: string;
  refreshToken: string;
  user: StoredUser;
};

type AuthContextValue = {
  user: StoredUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = authStorage.getUser();
    const token = authStorage.getAccessToken();
    if (stored && token) {
      // localStorage'daki kullanıcıyı hemen göster (anında yükleme hissi),
      // arka planda /auth/me ile doğrula
      setUser(stored);
      apiClient<StoredUser>("/auth/me")
        .then((fresh) => {
          setUser(fresh);
          authStorage.setSession(
            authStorage.getAccessToken()!,
            authStorage.getRefreshToken()!,
            fresh
          );
        })
        .catch((err) => {
          // SADECE gerçek 401 (token artık geçersiz) durumunda çıkış yap.
          // Ağ hatası, sayfa geçişinde isteğin iptal olması gibi geçici
          // durumlarda kullanıcıyı oturumdan atmayalım.
          if (err instanceof ApiError && err.status === 401) {
            authStorage.clear();
            setUser(null);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
    authStorage.setSession(data.token, data.refreshToken, data.user);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
    authStorage.setSession(data.token, data.refreshToken, data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // token zaten geçersiz olabilir, yine de local temizle
    } finally {
      authStorage.clear();
      setUser(null);
      router.push("/giris");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const fresh = await apiClient<StoredUser>("/auth/me");
    setUser(fresh);
    authStorage.setSession(
      authStorage.getAccessToken()!,
      authStorage.getRefreshToken()!,
      fresh
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}

export { ApiError };
