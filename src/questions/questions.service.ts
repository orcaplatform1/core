import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.question.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.question.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    quizId: string;
  }) {
    return this.prisma.question.create({
      data,
    });
  }
}
