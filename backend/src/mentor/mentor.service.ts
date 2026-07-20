import { Injectable, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

const DAILY_FREE_LIMIT = 10;

@Injectable()
export class MentorService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureAccess(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({
      where: { userId },
    });
    if (enrollmentCount === 0) {
      throw new ForbiddenException(
        'Yapay Zeka Mentoru sadece sahip olduğunuz programlarda kullanılabilir.',
      );
    }
  }

  private async checkAndConsumeQuota(userId: string): Promise<'FREE' | 'CREDIT'> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const conversation = await this.prisma.conversation.findUnique({
      where: { userId },
    });

    const usedToday = conversation
      ? await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            role: 'USER',
            createdAt: { gte: startOfDay },
          },
        })
      : 0;

    if (usedToday < DAILY_FREE_LIMIT) {
      return 'FREE';
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.mentorCredits <= 0) {
      throw new ForbiddenException(
        `Günlük ücretsiz Yapay Zeka Mentoru hakkınız (${DAILY_FREE_LIMIT} mesaj) doldu. Devam etmek için Mentor Kredi satın alabilirsiniz.`,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mentorCredits: { decrement: 1 } },
    });

    return 'CREDIT';
  }

  private async ensureLessonAccess(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { programId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Ders bulunamadı.');
    }
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId: lesson.module.programId } },
    });
    if (!enrolled) {
      throw new ForbiddenException('Bu derse erişiminiz yok.');
    }
  }

  private async getOrCreateConversation(userId: string) {
    const existing = await this.prisma.conversation.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { userId },
    });
  }

  private async callAiMentor(userMessage: string): Promise<string> {
    // Claude API entegrasyonu henüz eklenmedi — API key eklendiğinde burası doldurulacak.
    throw new ServiceUnavailableException(
      'Yapay Zeka Mentoru şu anda yapılandırılıyor, kısa süre sonra aktif olacak.',
    );
  }

  async sendMessage(userId: string, dto: CreateMessageDto) {
    await this.ensureAccess(userId);
    if (dto.lessonId) {
      await this.ensureLessonAccess(userId, dto.lessonId);
    }
    const quotaSource = await this.checkAndConsumeQuota(userId);
    const conversation = await this.getOrCreateConversation(userId);
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.content,
        lessonId: dto.lessonId,
      },
    });

    const aiReply = await this.callAiMentor(dto.content);

    const mentorMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'MENTOR',
        content: aiReply,
        lessonId: dto.lessonId,
      },
    });

    return { message: mentorMessage, quotaSource };
  }

  async getHistory(userId: string, lessonId?: string) {
    await this.ensureAccess(userId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { userId },
      include: {
        messages: {
          where: lessonId ? { lessonId } : undefined,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return conversation?.messages ?? [];
  }

  async getDiscussedLessons(userId: string) {
    await this.ensureAccess(userId);
    const conversation = await this.prisma.conversation.findUnique({ where: { userId } });
    if (!conversation) return [];
    const rows = await this.prisma.message.findMany({
      where: { conversationId: conversation.id, lessonId: { not: null } },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });
    const ids = rows.map((r) => r.lessonId).filter((id): id is string => !!id);
    if (ids.length === 0) return [];
    return this.prisma.lesson.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, moduleId: true },
    });
  }

  async getQuotaStatus(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const conversation = await this.prisma.conversation.findUnique({
      where: { userId },
    });

    const usedToday = conversation
      ? await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            role: 'USER',
            createdAt: { gte: startOfDay },
          },
        })
      : 0;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      dailyFreeLimit: DAILY_FREE_LIMIT,
      usedToday,
      freeRemaining: Math.max(DAILY_FREE_LIMIT - usedToday, 0),
      mentorCredits: user?.mentorCredits ?? 0,
    };
  }
}
