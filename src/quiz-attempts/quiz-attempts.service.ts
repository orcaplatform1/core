import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: any) {
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

    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
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
