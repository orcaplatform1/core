import { Injectable } from '@nestjs/common';
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
    return this.prisma.quizAnswer.create({
      data: {
        ...data,
        timeSpent: data.timeSpent ?? 0,
      },
    });
  }
}
