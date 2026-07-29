import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Bildirim/duyuru anlık teslimi — önceden sadece 60sn'lik polling vardı (bkz.
// use-notifications.ts refetchInterval), admin bir duyuru gönderdiğinde kullanıcı
// sayfayı yenilemeden görmüyordu. Kimlik doğrulama JWT ile yapılır (REST ile aynı
// secret); her kullanıcı kendi userId'sine ait bir room'a katılır.
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) throw new Error('Token yok');
      const payload = this.jwtService.verify(token);
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  emitToUser(userId: string, event: 'notification' | 'announcement', payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
