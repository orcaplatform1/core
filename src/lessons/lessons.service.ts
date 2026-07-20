import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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

  async create(data: CreateLessonDto, actorId: string) {
    const created = await this.prisma.lesson.create({ data });
    await this.auditLogService.log(actorId, 'LESSON_CREATE', 'Lesson', created.id);
    return created;
  }

  async update(id: string, data: Partial<CreateLessonDto>, actorId: string) {
    const updated = await this.prisma.lesson.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'LESSON_UPDATE', 'Lesson', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.lesson.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'LESSON_DELETE', 'Lesson', id);
    return { message: 'Silindi.' };
  }

  async addResource(lessonId: string, name: string, url: string, actorId: string) {
    const resource = await this.prisma.lessonResource.create({ data: { lessonId, name, url } });
    await this.auditLogService.log(actorId, 'LESSON_RESOURCE_ADD', 'LessonResource', resource.id);
    return resource;
  }

  async removeResource(resourceId: string, actorId: string) {
    await this.prisma.lessonResource.delete({ where: { id: resourceId } });
    await this.auditLogService.log(actorId, 'LESSON_RESOURCE_DELETE', 'LessonResource', resourceId);
    return { message: 'Silindi.' };
  }
}
