import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.quiz.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.quiz.findUnique({ where: { id } });
  }

  async create(data: { title: string; description?: string; lessonId: string; timeLimitMinutes?: number }) {
    return this.prisma.quiz.create({ data });
  }

  async update(id: string, data: { title?: string; description?: string; timeLimitMinutes?: number }) {
    return this.prisma.quiz.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.quiz.delete({ where: { id } });
  }
}
