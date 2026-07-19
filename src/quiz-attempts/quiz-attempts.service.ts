import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function calculateGrade(percentage: number): 'FAILED' | 'GOOD' | 'SUCCESS' | 'EXCELLENT' {
  if (percentage < 70) return 'FAILED';
  if (percentage <= 80) return 'GOOD';
  if (percentage <= 89) return 'SUCCESS';
  return 'EXCELLENT';
}

@Injectable()
export class QuizAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(userId: string, dto: any) {
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
        totalQuestions: dto.totalQuestions ?? 0,
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

    return this.prisma.quizAttempt.update({
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
  }

  async findAll() {
    return this.prisma.quizAttempt.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
