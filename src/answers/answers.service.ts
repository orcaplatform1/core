import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.answer.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.answer.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    text: string;
    isCorrect?: boolean;
    questionId: string;
  }) {
    return this.prisma.answer.create({
      data,
    });
  }
}
