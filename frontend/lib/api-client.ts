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

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      authStorage.clear();
      return false;
    }
    return true;
  } catch {
    authStorage.clear();
    return false;
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
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      credentials: "include",
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
    const refreshed = await refreshPromise;
    if (refreshed) {
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
