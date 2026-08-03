import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ProgressService } from '../progress/progress.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

const BYPASS_ROLES = ['SUPER_ADMIN', 'STAFF'];

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly progressService: ProgressService,
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

  async findById(userId: string, id: string, role?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { resources: true, module: { include: { program: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Ders bulunamadı.');
    }

    if (role && BYPASS_ROLES.includes(role)) {
      return { ...lesson, locked: false, lockReason: null };
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_programId: { userId, programId: lesson.module.programId },
      },
    });

    if (!enrollment) {
      return {
        ...lesson,
        videoUrl: null,
        pdfUrl: null,
        resources: [],
        locked: true,
        lockReason: 'PAYMENT_REQUIRED' as const,
      };
    }

    const unlocked = await this.progressService.isLevelUnlocked(userId, lesson.module.program.level);
    if (!unlocked) {
      return {
        ...lesson,
        videoUrl: null,
        pdfUrl: null,
        resources: [],
        locked: true,
        lockReason: 'LEVEL_LOCKED' as const,
      };
    }

    return { ...lesson, locked: false, lockReason: null };
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

  async getMyNote(userId: string, lessonId: string) {
    return this.prisma.lessonNote.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }

  async saveMyNote(userId: string, lessonId: string, content: string) {
    if (!content.trim()) {
      await this.prisma.lessonNote.deleteMany({ where: { userId, lessonId } });
      return null;
    }
    return this.prisma.lessonNote.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, content },
      update: { content },
    });
  }
}
