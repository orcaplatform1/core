import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLiveLessonDto } from './dto/create-live-lesson.dto';
@Injectable()
export class LiveLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}
  async create(dto: CreateLiveLessonDto, actorId: string) {
    const created = await this.prisma.liveLesson.create({
      data: {
        title: dto.title,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes,
        discordLink: dto.discordLink,
      },
    });
    await this.auditLogService.log(actorId, 'LIVE_LESSON_CREATE', 'LiveLesson', created.id);

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true },
    });
    if (students.length > 0) {
      await this.notificationsService.createForManyUsers(
        students.map((s) => s.id),
        {
          type: 'LIVE_LESSON_REMINDER' as any,
          title: 'Yeni Canlı Ders Planlandı',
          message: `${created.title} — ${created.scheduledAt.toLocaleString('tr-TR')}`,
          link: '/live-lessons',
        },
      );
    }

    return created;
  }
  async findAll() {
    return this.prisma.liveLesson.findMany({
      orderBy: { scheduledAt: 'desc' },
    });
  }
  async remove(id: string, actorId: string) {
    const exists = await this.prisma.liveLesson.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Canlı ders bulunamadı.');
    }
    await this.prisma.liveLesson.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'LIVE_LESSON_DELETE', 'LiveLesson', id);
    return { message: 'Silindi.' };
  }
  async getNext() {
    const now = new Date();
    const lesson = await this.prisma.liveLesson.findFirst({
      where: {
        scheduledAt: {
          gte: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    if (!lesson) {
      return null;
    }
    const startTime = lesson.scheduledAt.getTime();
    const endTime = startTime + lesson.durationMinutes * 60 * 1000;
    const nowTime = now.getTime();
    const isLive = nowTime >= startTime && nowTime <= endTime;
    const startsInSeconds = Math.max(0, Math.floor((startTime - nowTime) / 1000));
    return {
      id: lesson.id,
      title: lesson.title,
      scheduledAt: lesson.scheduledAt,
      durationMinutes: lesson.durationMinutes,
      isLive,
      startsInSeconds,
      discordLink: isLive ? lesson.discordLink : null,
    };
  }
}
