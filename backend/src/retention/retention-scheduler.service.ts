import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MentorService } from '../mentor/mentor.service';
import { getMondayWeekStart } from '../common/week';

const INACTIVITY_THRESHOLD_DAYS = 3;
const MIN_ATTEMPTS_FOR_WEAK_MODULE = 2;
const WEAK_MODULE_PASS_RATE_THRESHOLD = 0.7;

@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mentorService: MentorService,
  ) {}

  // Her gün 09:00 — e-posta sağlayıcısı henüz seçilmediği için (legal tarafta bekleyen
  // bir madde) bu bildirim şimdilik yalnızca in-app Notifications modülüne düşer;
  // sağlayıcı seçilince e-posta kanalı buraya eklenecek.
  @Cron('0 9 * * *')
  async runInactivityReminders() {
    const cutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const inactiveUsers = await this.prisma.user.findMany({
      where: { role: 'STUDENT', lastActivityDate: { lte: cutoff } },
      select: { id: true },
    });

    const targets: string[] = [];
    for (const { id: userId } of inactiveUsers) {
      const recentReminder = await this.prisma.notification.findFirst({
        where: { userId, type: 'STREAK_REMINDER', createdAt: { gte: cutoff } },
      });
      if (!recentReminder) targets.push(userId);
    }

    if (targets.length === 0) return;

    await this.notificationsService.createForManyUsers(targets, {
      type: 'STREAK_REMINDER' as any,
      title: 'Serin bitmek üzere!',
      message: 'Birkaç gündür platforma giriş yapmadın — serini korumak için bugün kısa bir ders tamamla.',
      link: '/dashboard',
    });

    this.logger.log(`Inaktiflik hatırlatması gönderildi: ${targets.length} kullanıcı.`);
  }

  // Her Pazartesi 08:00 — quiz sonuçlarından zayıf konu tespiti (LLM gerektirmez, şablonla
  // çalışır); ANTHROPIC_API_KEY eklenince yalnızca mentor.service.ts'teki interaktif yanıt
  // (callAiMentor) etkinleşecek, bu tespit/şablon mantığı değişmeden kalır.
  @Cron('0 8 * * 1')
  async runProactiveMentorSuggestions() {
    const weekStart = getMondayWeekStart(new Date());

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true },
    });

    let sentCount = 0;

    for (const { id: userId } of students) {
      const already = await this.prisma.mentorSuggestion.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      });
      if (already) continue;

      const weakModule = await this.findWeakestModule(userId);
      if (!weakModule) continue;

      const content = `İstatistiklerine göre "${weakModule.title}" konusunda zorlanıyorsun — ilgili dersleri tekrar etmeni ve quizleri yeniden denemeni öneririm.`;

      await this.mentorService.injectProactiveMessage(userId, content);
      await this.prisma.mentorSuggestion.create({ data: { userId, weekStart } });

      await this.notificationsService.create({
        userId,
        type: 'AI_SUGGESTION' as any,
        title: "Mentor'dan yeni bir öneri var",
        message: `"${weakModule.title}" konusu için kişisel bir tavsiye bıraktı.`,
        link: '/mentor',
      });

      sentCount += 1;
    }

    this.logger.log(`Proaktif mentor önerisi gönderildi: ${sentCount} kullanıcı.`);
  }

  private async findWeakestModule(userId: string): Promise<{ id: string; title: string } | null> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, endedAt: { not: null } },
      select: { moduleId: true, passed: true },
    });
    if (attempts.length === 0) return null;

    const statsByModule = new Map<string, { total: number; passed: number }>();
    for (const attempt of attempts) {
      const stats = statsByModule.get(attempt.moduleId) ?? { total: 0, passed: 0 };
      stats.total += 1;
      if (attempt.passed) stats.passed += 1;
      statsByModule.set(attempt.moduleId, stats);
    }

    let worstModuleId: string | null = null;
    let worstRate = 1;
    for (const [moduleId, stats] of statsByModule) {
      if (stats.total < MIN_ATTEMPTS_FOR_WEAK_MODULE) continue;
      const rate = stats.passed / stats.total;
      if (rate < worstRate) {
        worstRate = rate;
        worstModuleId = moduleId;
      }
    }

    if (!worstModuleId || worstRate >= WEAK_MODULE_PASS_RATE_THRESHOLD) return null;

    const module = await this.prisma.module.findUnique({
      where: { id: worstModuleId },
      select: { id: true, title: true },
    });
    return module;
  }
}
