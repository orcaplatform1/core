import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';

const TICKET_SELECT = {
  id: true,
  subject: true,
  category: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  user: { select: { id: true, fullName: true, username: true, avatarUrl: true, role: true } },
};

const MESSAGE_SELECT = {
  id: true,
  ticketId: true,
  senderId: true,
  content: true,
  createdAt: true,
  sender: { select: { id: true, fullName: true, username: true, avatarUrl: true, role: true } },
};

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async notifyAdmins(title: string, message: string, link: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    await Promise.all(
      admins.map((a) => this.notifications.create({ userId: a.id, type: 'SYSTEM', title, message, link })),
    );
  }

  // Misafir (GUEST) dahil giris yapmis her kullanici destek talebi acabilir -
  // odeme sorunu yasayan ama henuz hicbir egitim satin almamis biri bile
  // destek almasi gerekebilir.
  async create(userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category,
        messages: { create: { senderId: userId, content: dto.message } },
      },
      select: TICKET_SELECT,
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    await this.notifyAdmins(
      'Yeni destek talebi',
      `${user?.fullName ?? 'Bir kullanıcı'}: "${dto.subject}"`,
      `/manage/support?ticket=${ticket.id}`,
    );

    return ticket;
  }

  async listMine(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: TICKET_SELECT,
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  private async getTicketOr404(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, select: TICKET_SELECT });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');
    return ticket;
  }

  async getOne(id: string, userId: string, role: string) {
    const ticket = await this.getTicketOr404(id);
    const isStaff = role === 'STAFF' || role === 'SUPER_ADMIN';
    if (!isStaff && ticket.user.id !== userId) {
      throw new ForbiddenException('Bu destek talebine erişemezsiniz.');
    }
    const messages = await this.prisma.supportTicketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      select: MESSAGE_SELECT,
    });
    return { ticket, messages };
  }

  async reply(id: string, userId: string, role: string, content: string) {
    const ticket = await this.getTicketOr404(id);
    const isStaff = role === 'STAFF' || role === 'SUPER_ADMIN';
    if (!isStaff && ticket.user.id !== userId) {
      throw new ForbiddenException('Bu destek talebine yanıt veremezsiniz.');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: { ticketId: id, senderId: userId, content },
      select: MESSAGE_SELECT,
    });

    // Yetkili yanit yazinca talep otomatik "islemde" olur; kullanici kapali bir
    // talebe yazinca otomatik yeniden acilir (kapali talebe cevap = "hala devam
    // ediyor" demek, kullaniciyi ayrica "yeniden ac" butonuna zorlamaya gerek yok.
    const nextStatus = isStaff ? (ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status) : 'OPEN';
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: nextStatus, closedAt: nextStatus === 'CLOSED' ? ticket.closedAt : null },
    });

    if (isStaff) {
      await this.notifications.create({
        userId: ticket.user.id,
        type: 'SYSTEM',
        title: 'Destek talebinize yanıt geldi',
        message: `"${ticket.subject}" talebinize bir yanıt yazıldı.`,
        link: `/support?ticket=${id}`,
      });
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
      await this.notifyAdmins(
        'Destek talebine yeni mesaj',
        `${user?.fullName ?? 'Bir kullanıcı'}: "${ticket.subject}"`,
        `/manage/support?ticket=${id}`,
      );
    }

    return message;
  }

  // --- Admin ---

  async listAll(page = 1, limit = 20, status?: string, category?: string) {
    const skip = (page - 1) * limit;
    const where = {
      user: NOT_DELETED_USER_WHERE,
      ...(status ? { status: status as any } : {}),
      ...(category ? { category: category as any } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: TICKET_SELECT,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async updateStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') {
    await this.getTicketOr404(id);
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status, closedAt: status === 'CLOSED' ? new Date() : null },
      select: TICKET_SELECT,
    });
    return updated;
  }

  async remove(id: string) {
    await this.getTicketOr404(id);
    await this.prisma.supportTicket.delete({ where: { id } });
    return { success: true };
  }
}
