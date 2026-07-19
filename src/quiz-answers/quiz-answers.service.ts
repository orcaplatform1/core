import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizAnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.quizAnswer.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.quizAnswer.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    quizAttemptId: string;
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
    timeSpent?: number;
  }) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: data.quizAttemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz denemesi bulunamadı.');
    }

    if (attempt.endedAt) {
      throw new BadRequestException('Bu quiz denemesi tamamlanmış, cevap değiştirilemez.');
    }

    return this.prisma.quizAnswer.upsert({
      where: {
        quizAttemptId_questionId: {
          quizAttemptId: data.quizAttemptId,
          questionId: data.questionId,
        },
      },
      update: {
        selectedAnswerId: data.selectedAnswerId,
        isCorrect: data.isCorrect,
        timeSpent: data.timeSpent ?? 0,
        answeredAt: new Date(),
      },
      create: {
        ...data,
        timeSpent: data.timeSpent ?? 0,
      },
    });
  }
}
