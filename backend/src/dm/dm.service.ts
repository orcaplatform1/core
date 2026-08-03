import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SuspensionsService } from '../suspensions/suspensions.service';
import { PresenceService } from '../notifications/presence.service';
import { containsProfanity } from './profanity-filter';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';

const RATE_LIMIT_SECONDS = 30;

const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  recipientId: true,
  content: true,
  status: true,
  blockedReason: true,
  readAt: true,
  editedAt: true,
  deletedAt: true,
  deletedBy: true,
  createdAt: true,
  edits: { select: { previousContent: true, editedAt: true }, orderBy: { editedAt: 'asc' as const } },
};

@Injectable()
export class DmService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: NotificationsGateway,
    private readonly suspensions: SuspensionsService,
    private readonly presence: PresenceService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  private async getBlockStatus(userA: string, userB: string): Promise<{ blocked: boolean; blockerIsA: boolean }> {
    const [aBlockedB, bBlockedA] = await Promise.all([
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userA, blockedId: userB } } }),
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userB, blockedId: userA } } }),
    ]);
    return { blocked: !!aBlockedB || !!bBlockedA, blockerIsA: !!aBlockedB };
  }

  async sendMessage(senderId: string, recipientId: string, content: string) {
    if (senderId === recipientId) throw new ForbiddenException('Kendinize mesaj gönderemezsiniz.');
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Mesajlasma yasagi (admin tarafindan sikayet uzerine verilmis) - tum kullanicilarla
    // mesajlasmayi kapsar, sadece bu alicidan bagimsiz.
    const activeSuspension = await this.suspensions.getActive(senderId, 'DM');
    if (activeSuspension) {
      await this.prisma.dmMessage.create({
        data: { senderId, recipientId, content, status: 'BLOCKED_SUSPENDED', blockedReason: 'Mesajlaşma yasağı aktif' },
      });
      throw new ForbiddenException(this.suspensions.buildBanMessage('mesaj', activeSuspension.expiresAt));
    }

    // Iki yonlu engel kontrolu: ya ben onu ya da o beni engellemis olabilir
    const { blocked, blockerIsA: senderBlockedRecipient } = await this.getBlockStatus(senderId, recipientId);
    if (blocked) {
      await this.prisma.dmMessage.create({
        data: { senderId, recipientId, content, status: 'BLOCKED_USER_BLOCKED', blockedReason: 'Kullanıcılar birbirini engellemiş' },
      });
      throw new ForbiddenException(
        senderBlockedRecipient
          ? 'Bu kullanıcıyı engellediğiniz için mesaj yazamazsınız.'
          : 'Bu kullanıcı tarafından engellendiğiniz için mesaj yazamazsınız.',
      );
    }

    // Spam korumasi: bir mesaj atan 30 saniye boyunca (kime olursa olsun) tekrar
    // mesaj atamaz. NX ile atomik kontrol - iki istek ayni anda gelse bile sadece
    // biri basarili olur.
    const rateLimitKey = `dm:ratelimit:${senderId}`;
    const alreadySentRecently = await this.redis.exists(rateLimitKey);
    if (alreadySentRecently) {
      await this.prisma.dmMessage.create({
        data: { senderId, recipientId, content, status: 'BLOCKED_RATE_LIMIT', blockedReason: 'Çok sık mesaj gönderimi (30sn sınırı)' },
      });
      throw new HttpException('Ard arda çok hızlı mesaj gönderiyorsunuz, 30 saniye beklemelisiniz.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (containsProfanity(content)) {
      await this.prisma.dmMessage.create({
        data: { senderId, recipientId, content, status: 'BLOCKED_PROFANITY', blockedReason: 'Küfür/hakaret içeriği tespit edildi' },
      });
      throw new ForbiddenException('Bu mesajı gönderemezsiniz.');
    }

    const message = await this.prisma.dmMessage.create({
      data: { senderId, recipientId, content, status: 'SENT' },
      select: MESSAGE_SELECT,
    });
    await this.redis.set(rateLimitKey, '1', 'EX', RATE_LIMIT_SECONDS);
    this.gateway.emitToUser(recipientId, 'dm:message', message);
    return message;
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.dmMessage.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Mesaj bulunamadı.');
    if (message.senderId !== userId) throw new ForbiddenException('Sadece kendi mesajınızı düzenleyebilirsiniz.');
    if (message.status !== 'SENT') throw new ForbiddenException('Bu mesaj düzenlenemez.');

    await this.prisma.dmMessageEdit.create({
      data: { messageId, previousContent: message.content },
    });
    const updated = await this.prisma.dmMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      select: MESSAGE_SELECT,
    });
    this.gateway.emitToUser(message.recipientId, 'dm:message-edited', updated);
    return updated;
  }

  // Sadece SUPER_ADMIN silebilir - student/staff kendi gonderdigi mesaji bile silemez.
  // STAFF sadece kendi gonderdigi mesaji silebilir, SUPER_ADMIN herkesinkini silebilir.
  async deleteMessage(actorId: string, messageId: string, actorRole: string) {
    const message = await this.prisma.dmMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mesaj bulunamadı.');
    if (actorRole !== 'SUPER_ADMIN' && message.senderId !== actorId) {
      throw new ForbiddenException('Sadece kendi mesajınızı silebilirsiniz.');
    }
    await this.prisma.dmMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: actorId },
    });
    return { success: true };
  }

  async reportMessage(reporterId: string, messageId: string, reason: string) {
    const message = await this.prisma.dmMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mesaj bulunamadı.');
    if (message.senderId !== reporterId && message.recipientId !== reporterId) {
      throw new ForbiddenException('Bu mesajı şikayet edemezsiniz.');
    }

    const report = await this.prisma.dmMessageReport.create({ data: { messageId, reporterId, reason } });

    const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    const reporter = await this.prisma.user.findUnique({ where: { id: reporterId }, select: { username: true, fullName: true } });
    await Promise.all(
      admins.map((a) =>
        this.notifications.create({
          userId: a.id,
          type: 'SYSTEM',
          title: 'Yeni mesaj şikayeti',
          message: `${reporter?.fullName ?? 'Bir kullanıcı'} bir mesajı şikayet etti: "${reason}"`,
          link: '/manage/messages',
        }),
      ),
    );
    return report;
  }

  async getConversations(userId: string) {
    const messages = await this.prisma.dmMessage.findMany({
      where: { status: 'SENT', deletedAt: null, OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, senderId: true, recipientId: true, content: true, createdAt: true, readAt: true,
        sender: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        recipient: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    const byPartner = new Map<string, typeof messages[number][]>();
    for (const m of messages) {
      const partnerId = m.senderId === userId ? m.recipientId : m.senderId;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, []);
      byPartner.get(partnerId)!.push(m);
    }

    return [...byPartner.entries()].map(([partnerId, msgs]) => {
      const last = msgs[0];
      const partner = last.senderId === userId ? last.recipient : last.sender;
      const unreadCount = msgs.filter((m) => m.recipientId === userId && !m.readAt).length;
      return { partner: { ...partner, online: this.presence.isOnline(partnerId) }, lastMessage: last, unreadCount };
    });
  }

  async getThread(userId: string, otherUserId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const where = {
      status: 'SENT' as const,
      deletedAt: null,
      OR: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    };
    const [messages, total, isBlockedByMe, hasBlockedMe, suspension] = await Promise.all([
      this.prisma.dmMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select: MESSAGE_SELECT }),
      this.prisma.dmMessage.count({ where }),
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId: otherUserId } } }),
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: otherUserId, blockedId: userId } } }),
      this.suspensions.getActive(userId, 'DM'),
    ]);

    const now = new Date();
    const readResult = await this.prisma.dmMessage.updateMany({
      where: { senderId: otherUserId, recipientId: userId, readAt: null, status: 'SENT' },
      data: { readAt: now },
    });
    if (readResult.count > 0) {
      this.gateway.emitToUser(otherUserId, 'dm:messages-read', { readerId: userId, readAt: now.toISOString() });
    }

    return {
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      isBlockedByMe: !!isBlockedByMe,
      hasBlockedMe: !!hasBlockedMe,
      otherUserOnline: this.presence.isOnline(otherUserId),
      suspendedMessage: suspension ? this.suspensions.buildBanMessage('mesaj', suspension.expiresAt) : null,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.dmMessage.count({
      where: { recipientId: userId, readAt: null, status: 'SENT', deletedAt: null },
    });
    return { count };
  }

  // --- Admin ---

  async adminListMessages(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    // BLOCKED_RATE_LIMIT loglari spam gurultusu yaratiyor (30sn siniri normal
    // kullanimda bile sik tetiklenebiliyor) - admin logunda gosterilmiyor,
    // sadece kufur filtresine takilanlar "basarisiz mesaj" olarak gorunur.
    const where = {
      status: { not: 'BLOCKED_RATE_LIMIT' as const },
      sender: NOT_DELETED_USER_WHERE,
      recipient: NOT_DELETED_USER_WHERE,
    };
    const [data, total] = await Promise.all([
      this.prisma.dmMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          ...MESSAGE_SELECT,
          sender: { select: { id: true, fullName: true, username: true } },
          recipient: { select: { id: true, fullName: true, username: true } },
        },
      }),
      this.prisma.dmMessage.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async adminListBlockActions(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { blocker: NOT_DELETED_USER_WHERE, blocked: NOT_DELETED_USER_WHERE };
    const [data, total] = await Promise.all([
      this.prisma.block.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, createdAt: true,
          blocker: { select: { id: true, fullName: true, username: true } },
          blocked: { select: { id: true, fullName: true, username: true } },
        },
      }),
      this.prisma.block.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async adminListReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      reporter: NOT_DELETED_USER_WHERE,
      message: { sender: NOT_DELETED_USER_WHERE, recipient: NOT_DELETED_USER_WHERE },
    };
    const [data, total] = await Promise.all([
      this.prisma.dmMessageReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, reason: true, createdAt: true,
          reporter: { select: { id: true, fullName: true, username: true } },
          message: {
            select: {
              id: true, content: true, createdAt: true,
              sender: { select: { id: true, fullName: true, username: true } },
              recipient: { select: { id: true, fullName: true, username: true } },
            },
          },
        },
      }),
      this.prisma.dmMessageReport.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
