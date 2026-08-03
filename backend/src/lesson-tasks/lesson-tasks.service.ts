import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class LessonTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getForLesson(lessonId: string, userId: string) {
    const task = await this.prisma.lessonTask.findUnique({ where: { lessonId } });
    if (!task) return { task: null, myProgress: null };

    const myProgress = await this.prisma.lessonTaskProgress.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    });
    return { task, myProgress };
  }

  async upsert(lessonId: string, data: { title: string; description: string; targetCount: number }, actorId: string) {
    const task = await this.prisma.lessonTask.upsert({
      where: { lessonId },
      create: { lessonId, ...data },
      update: data,
    });
    await this.auditLogService.log(actorId, 'LESSON_TASK_UPSERT', 'LessonTask', task.id);
    return task;
  }

  async remove(lessonId: string, actorId: string) {
    const task = await this.prisma.lessonTask.findUnique({ where: { lessonId } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    await this.prisma.lessonTask.delete({ where: { id: task.id } });
    await this.auditLogService.log(actorId, 'LESSON_TASK_DELETE', 'LessonTask', task.id);
    return { message: 'Silindi.' };
  }

  async setMyProgress(lessonId: string, userId: string, completedCount: number) {
    const task = await this.prisma.lessonTask.findUnique({ where: { lessonId } });
    if (!task) throw new NotFoundException('Bu derse ait bir görev yok.');

    const clamped = Math.max(0, Math.min(completedCount, task.targetCount));
    return this.prisma.lessonTaskProgress.upsert({
      where: { userId_taskId: { userId, taskId: task.id } },
      create: { userId, taskId: task.id, completedCount: clamped, completed: clamped >= task.targetCount },
      update: { completedCount: clamped, completed: clamped >= task.targetCount },
    });
  }
}
