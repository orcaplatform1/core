export type StoredUser = {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  role: "SUPER_ADMIN" | "STAFF" | "STUDENT" | "GUEST";
  gender: "ERKEK" | "KADIN";
  avatarUrl?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  sessionId?: string;
  [key: string]: unknown;
};

const ACCESS_KEY = "orca_token";
const REFRESH_KEY = "orca_refresh_token";
const USER_KEY = "orca_user";

export const authStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  getUser(): StoredUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  setSession(accessToken: string, refreshToken: string, user: StoredUser) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setAccessToken(accessToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
