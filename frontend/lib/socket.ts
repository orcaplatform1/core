import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Bildirim/duyuru anlık teslimi için tekil websocket bağlantısı. Backend
// `/orca/backend` altında ters proxy'lendiğinden (bkz. nginx traders.tr config),
// socket.io "path" ile o prefix'i, namespace ile de "/notifications"'ı ayrı taşır.
// Kimlik doğrulama httpOnly cookie ile yapılır (withCredentials) - token artık
// JS'den okunamadığı için handshake'e elle eklenmiyor. Çağıran taraf (bkz.
// dashboard-topbar.tsx) zaten yalnızca giriş yapmış kullanıcı için çağırıyor.
export function getNotificationSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL!);
  socket = io(`${apiUrl.origin}/notifications`, {
    path: `${apiUrl.pathname.replace(/\/$/, "")}/socket.io`,
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectNotificationSocket() {
  socket?.disconnect();
  socket = null;
}
