import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { PointsService } from '../points/points.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getMondayWeekStart } from '../common/week';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';

function calculateGrade(percentage: number): 'FAILED' | 'GOOD' | 'SUCCESS' | 'EXCELLENT' {
  if (percentage < 70) return 'FAILED';
  if (percentage <= 80) return 'GOOD';
  if (percentage <= 89) return 'SUCCESS';
  return 'EXCELLENT';
}

const QUIZ_PASS_POINTS_REWARD = 10;
const WEEKLY_CHALLENGE_QUIZ_COUNT = 3;
const WEEKLY_CHALLENGE_BADGE_NAME = 'Haftalık Meydan Okuma';
const WEEKLY_CHALLENGE_CREDIT_REWARD = 25;
const WEEKLY_CHALLENGE_POINTS_REWARD = 20;

@Injectable()
export class QuizAttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly pointsService: PointsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async expireIfStale(attempt: any, timeLimitMinutes: number) {
    if (attempt.endedAt) return attempt;

    const elapsedMs = Date.now() - attempt.startedAt.getTime();
    const limitMs = timeLimitMinutes * 60 * 1000;

    if (elapsedMs > limitMs) {
      return this.prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          endedAt: new Date(attempt.startedAt.getTime() + limitMs),
          passed: false,
          grade: 'FAILED',
          expired: true,
        },
      });
    }

    return attempt;
  }

  async create(userId: string, dto: CreateQuizAttemptDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: dto.quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz bulunamadı.');
    }

    const existingOpen = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: dto.quizId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (existingOpen) {
      const resolved = await this.expireIfStale(existingOpen, quiz.timeLimitMinutes);

      if (!resolved.endedAt) {
        throw new BadRequestException(
          'Bu quiz için devam eden bir deneme var. Önce onu tamamlayın veya süresinin dolmasını bekleyin.',
        );
      }
    }

    return this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId: dto.quizId,
        lessonId: dto.lessonId,
        moduleId: dto.moduleId,
        programId: dto.programId,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        percentage: 0,
        score: 0,
        passed: false,
      },
    });
  }

  async finish(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz denemesi bulunamadı.');
    }

    if (attempt.endedAt) {
      return attempt;
    }

    const quiz = await this.prisma.quiz.findUnique({ where: { id: attempt.quizId } });
    const timeLimitMinutes = quiz?.timeLimitMinutes ?? 20;

    const elapsedMs = Date.now() - attempt.startedAt.getTime();
    if (elapsedMs > timeLimitMinutes * 60 * 1000) {
      return this.expireIfStale(attempt, timeLimitMinutes);
    }

    const answers = await this.prisma.quizAnswer.findMany({
      where: { quizAttemptId: attemptId },
    });

    const totalQuestions = answers.length || attempt.totalQuestions;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const wrongAnswers = totalQuestions - correctAnswers;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const grade = calculateGrade(percentage);
    const passed = percentage >= 70;

    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        percentage,
        score: percentage,
        grade,
        passed,
        endedAt: new Date(),
      },
    });

    if (passed) {
      await this.pointsService.award(attempt.userId, QUIZ_PASS_POINTS_REWARD);

      const passedCount = await this.prisma.quizAttempt.count({
        where: { userId: attempt.userId, passed: true },
      });
      await this.badgesService.checkAndGrant(attempt.userId, 'QUIZ_PASS_COUNT', passedCount);

      await this.checkWeeklyChallenge(attempt.userId);
    }

    return updated;
  }

  private async checkWeeklyChallenge(userId: string) {
    const weekStart = getMondayWeekStart(new Date());

    const alreadyRewarded = await this.prisma.weeklyChallengeCompletion.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
    if (alreadyRewarded) return;

    const passedThisWeek = await this.prisma.quizAttempt.count({
      where: { userId, passed: true, endedAt: { gte: weekStart } },
    });
    if (passedThisWeek < WEEKLY_CHALLENGE_QUIZ_COUNT) return;

    await this.prisma.weeklyChallengeCompletion.create({
      data: { userId, weekStart },
    });

    await this.badgesService.grantByNameIfEligible(userId, WEEKLY_CHALLENGE_BADGE_NAME);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mentorCredits: { increment: WEEKLY_CHALLENGE_CREDIT_REWARD } },
    });
    await this.pointsService.award(userId, WEEKLY_CHALLENGE_POINTS_REWARD);

    await this.notificationsService.create({
      userId,
      type: 'QUIZ_RESULT' as any,
      title: 'Haftalık Meydan Okuma tamamlandı!',
      message: `Bu hafta 3 quiz'i başarıyla geçtin — ${WEEKLY_CHALLENGE_CREDIT_REWARD} Mentor Kredisi hesabına eklendi.`,
      link: '/badges',
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quizAttempt.count(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz denemesi bulunamadı.');
    }

    return attempt;
  }

  async remove(id: string) {
    const exists = await this.prisma.quizAttempt.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new BadRequestException('Quiz denemesi bulunamadı.');
    }

    await this.prisma.quizAttempt.delete({
      where: { id },
    });

    return {
      message: 'Silindi.',
    };
  }
}
