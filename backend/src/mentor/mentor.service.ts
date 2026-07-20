import { Injectable, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

const DAILY_FREE_LIMIT = 10;

@Injectable()
export class MentorService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureAccess(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });

    if (enrollmentCount === 0) {
      throw new ForbiddenException('Yapay Zeka Mentoru sadece sahip olduğunuz programlarda kullanılabilir.');
    }
  }

  private async checkAndConsumeQuota(userId: string): Promise<'FREE' | 'CREDIT'> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const conversation = await this.prisma.conversation.findUnique({ where: { userId } });

    const todaysMessageCount = conversation
      ? await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            role: 'USER',
            createdAt: { gte: startOfDay },
          },
        })
      : 0;

    if (todaysMessageCount < DAILY_FREE_LIMIT) {
      return 'FREE';
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.mentorCredits <= 0) {
      throw new ForbiddenException({
        code: 'MENTOR_LIMIT_REACHED',
        message: `Günlük ücretsiz mesaj hakkınız (${DAILY_FREE_LIMIT}) doldu. Devam etmek için Mentor Kredisi satın alabilirsiniz.`,
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mentorCredits: { decrement: 1 } },
    });

    return 'CREDIT';
  }

  private async buildUserContext(userId: string, lessonId?: string) {
    const progress = await this.prisma.progress.findMany({ where: { userId } });
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0;

    let currentLesson: { id: string; title: string; description: string | null } | null = null;

    if (lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, title: true, description: true },
      });
      currentLesson = lesson ?? null;
    }

    return {
      completedLessons: progress.filter((p) => p.completed).length,
      totalTracked: progress.length,
      recentQuizAvg: avgScore,
      recentAttempts: attempts.map((a) => ({
        quizId: a.quizId,
        percentage: a.percentage,
        passed: a.passed,
      })),
      currentLesson,
    };
  }

  async sendMessage(userId: string, dto: CreateMessageDto) {
    await this.ensureAccess(userId);
    const quotaType = await this.checkAndConsumeQuota(userId);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    const conversation = await this.prisma.conversation.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.content,
        lessonId: dto.lessonId,
      },
    });

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Yapay Zeka Mentoru henüz yapılandırılmadı (ANTHROPIC_API_KEY eksik).',
      );
    }

    const context = await this.buildUserContext(userId, dto.lessonId);

    const lessonContextText = context.currentLesson
      ? `Kullanıcı şu an "${context.currentLesson.title}" dersini konuşuyor. Ders açıklaması: ${context.currentLesson.description ?? 'yok'}.`
      : '';

    const systemPrompt = `Sen ORCA platformunun Yapay Zeka Mentorusun. Sadece kullanıcının ORCA'daki eğitim verilerine göre konuş, internetten genel bilgi uydurma. ${lessonContextText} Kullanıcı verisi: ${JSON.stringify(context)}`;

    // Anthropic API çağrısı buraya gelecek (API key eklendiğinde aktif olacak):
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': apiKey,
    //     'anthropic-version': '2023-06-01',
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-sonnet-4-6',
    //     max_tokens: 1024,
    //     system: systemPrompt,
    //     messages: [{ role: 'user', content: dto.content }],
    //   }),
    // });
    // const data = await response.json();
    // const reply = data.content[0].text;

    const reply = 'AI Mentor API bağlantısı henüz aktif değil.';

    const saved = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'MENTOR',
        content: reply,
        lessonId: dto.lessonId,
      },
    });

    return { ...saved, quotaType };
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

  async getRemainingMessages(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [conversation, user] = await Promise.all([
      this.prisma.conversation.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const usedToday = conversation
      ? await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            role: 'USER',
            createdAt: { gte: startOfDay },
          },
        })
      : 0;

    return {
      dailyFreeLimit: DAILY_FREE_LIMIT,
      usedToday,
      freeRemaining: Math.max(0, DAILY_FREE_LIMIT - usedToday),
      mentorCredits: user?.mentorCredits ?? 0,
    };
  }
}
