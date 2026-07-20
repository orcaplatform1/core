import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lesson.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        durationSeconds: true,
        moduleId: true,
      },
    });
  }

  async findById(userId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { resources: true, module: true },
    });

    if (!lesson) {
      throw new NotFoundException('Ders bulunamadı.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_programId: { userId, programId: lesson.module.programId },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException({
        code: 'PAYMENT_REQUIRED',
        message: 'Bu derse erişmek için önce programı satın almanız gerekiyor.',
        programId: lesson.module.programId,
      });
    }

    return lesson;
  }

  async create(data: CreateLessonDto) {
    return this.prisma.lesson.create({ data });
  }

  async update(id: string, data: Partial<CreateLessonDto>) {
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }

  async addResource(lessonId: string, name: string, url: string) {
    return this.prisma.lessonResource.create({ data: { lessonId, name, url } });
  }

  async removeResource(resourceId: string) {
    return this.prisma.lessonResource.delete({ where: { id: resourceId } });
  }
}
