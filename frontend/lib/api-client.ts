import { authStorage } from "./auth-storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = authStorage.getRefreshToken();
  const accessToken = authStorage.getAccessToken();
  if (!refreshToken || !accessToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      authStorage.clear();
      return null;
    }
    const data = await res.json();
    authStorage.setAccessToken(data.token);
    const refreshKey = "orca_refresh_token";
    if (typeof window !== "undefined") {
      localStorage.setItem(refreshKey, data.refreshToken);
    }
    return data.token as string;
  } catch {
    authStorage.clear();
    return null;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean; // default true
  headers?: Record<string, string>;
};

export async function apiClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, headers = {} } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (auth) {
      const token = authStorage.getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && auth) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch {
      // ignore
    }
    const message =
      (errBody as { message?: string | string[] })?.message ??
      `İstek başarısız oldu (${res.status})`;
    throw new ApiError(
      res.status,
      Array.isArray(message) ? message.join(", ") : message,
      errBody
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
