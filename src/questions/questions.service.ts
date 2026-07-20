import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.question.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.question.findUnique({ where: { id } });
  }

  async create(data: {
    title: string;
    description?: string;
    explanation?: string;
    quizId: string;
  }) {
    return this.prisma.question.create({ data });
  }

  async update(id: string, data: { title?: string; description?: string; explanation?: string }) {
    return this.prisma.question.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.question.delete({ where: { id } });
  }
}
