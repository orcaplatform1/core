export type StoredUser = {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  role: "SUPER_ADMIN" | "STAFF" | "STUDENT" | "GUEST";
  gender: "ERKEK" | "KADIN";
  avatarUrl?: string | null;
  toolsSubscription?: "NONE" | "ACTIVE" | "EXPIRED";
  emailVerified?: boolean;
  phoneVerified?: boolean;
  sessionId?: string;
  [key: string]: unknown;
};

const USER_KEY = "orca_user";

// Access/refresh token'lar artik httpOnly cookie'de tasiniyor (bkz. backend
// auth-cookies.util.ts) - JS'den hic okunamiyor/yazilamiyor, bu yuzden burada
// sadece anlik yukleme hissi icin non-sensitive kullanici profili tutuluyor.
// Gercek oturum dogrulamasi her zaman /auth/me'ye gidilerek yapilir.
export const authStorage = {
  getUser(): StoredUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  setUser(user: StoredUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(USER_KEY);
  },
};
