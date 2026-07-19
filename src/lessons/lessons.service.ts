import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lesson.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      include: { resources: true },
    });
  }

  async findById(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { resources: true },
    });
  }

  async create(data: CreateLessonDto) {
    return this.prisma.lesson.create({
      data,
    });
  }

  async addResource(lessonId: string, name: string, url: string) {
    return this.prisma.lessonResource.create({
      data: { lessonId, name, url },
    });
  }
}
