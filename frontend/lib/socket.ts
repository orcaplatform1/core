import { io, type Socket } from "socket.io-client";
import { authStorage } from "./auth-storage";

let socket: Socket | null = null;

// Bildirim/duyuru anlık teslimi için tekil websocket bağlantısı. Backend
// `/core/backend` altında ters proxy'lendiğinden (bkz. nginx traders.tr config),
// socket.io "path" ile o prefix'i, namespace ile de "/notifications"'ı ayrı taşır.
export function getNotificationSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = authStorage.getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL!);
  socket = io(`${apiUrl.origin}/notifications`, {
    path: `${apiUrl.pathname.replace(/\/$/, "")}/socket.io`,
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectNotificationSocket() {
  socket?.disconnect();
  socket = null;
}
