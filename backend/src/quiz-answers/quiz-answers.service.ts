import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  async create(
    userId: string,
    data: {
      quizAttemptId: string;
      questionId: string;
      selectedAnswerId: string;
      timeSpent?: number;
    },
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: data.quizAttemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz denemesi bulunamadı.');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Bu quiz denemesi size ait değil.');
    }

    if (attempt.endedAt) {
      throw new BadRequestException('Bu quiz denemesi tamamlanmış, cevap değiştirilemez.');
    }

    // isCorrect istemciden asla alınmaz — cevap şıkkı üzerinden sunucu tarafında hesaplanır,
    // aksi halde istemci her zaman "doğru" göndererek quiz sonucunu manipüle edebilir.
    const selectedAnswer = await this.prisma.answer.findUnique({
      where: { id: data.selectedAnswerId },
    });

    if (!selectedAnswer || selectedAnswer.questionId !== data.questionId) {
      throw new BadRequestException('Geçersiz cevap seçeneği.');
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
        isCorrect: selectedAnswer.isCorrect,
        timeSpent: data.timeSpent ?? 0,
        answeredAt: new Date(),
      },
      create: {
        quizAttemptId: data.quizAttemptId,
        questionId: data.questionId,
        selectedAnswerId: data.selectedAnswerId,
        isCorrect: selectedAnswer.isCorrect,
        timeSpent: data.timeSpent ?? 0,
      },
    });
  }
}
