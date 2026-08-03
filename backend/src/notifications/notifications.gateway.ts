import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';

// Bildirim/duyuru anlık teslimi — önceden sadece 60sn'lik polling vardı (bkz.
// use-notifications.ts refetchInterval), admin bir duyuru gönderdiğinde kullanıcı
// sayfayı yenilemeden görmüyordu. Kimlik doğrulama JWT ile yapılır (REST ile aynı
// secret); her kullanıcı kendi userId'sine ait bir room'a katılır. Aynı bağlantı,
// admin paneldeki "şu an aktif" listesi için PresenceService'e de kaydedilir —
// ayrı bir heartbeat/polling mekanizması kurmaya gerek kalmadan.
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) throw new Error('Token yok');
      const payload = this.jwtService.verify(token);
      client.join(`user:${payload.sub}`);
      client.data.userId = payload.sub;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, fullName: true, avatarUrl: true, role: true, gender: true },
      });
      if (user) this.presence.addSocket(client.id, user);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.presence.removeSocket(client.id);
  }

  emitToUser(
    userId: string,
    event: 'notification' | 'announcement' | 'dm:message' | 'dm:message-edited' | 'dm:messages-read',
    payload: unknown,
  ) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
