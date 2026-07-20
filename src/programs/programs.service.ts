import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.program.findUnique({ where: { id } });
  }

  async create(data: {
    title: string;
    description?: string;
    categoryId?: string;
    coverImageUrl?: string;
    level?: string;
    durationHours?: number;
  }) {
    return this.prisma.program.create({ data: data as any });
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    categoryId?: string;
    coverImageUrl?: string;
    level?: string;
    durationHours?: number;
  }) {
    return this.prisma.program.update({ where: { id }, data: data as any });
  }

  async remove(id: string) {
    return this.prisma.program.delete({ where: { id } });
  }
}
