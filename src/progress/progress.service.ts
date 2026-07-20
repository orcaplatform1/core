import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { BadgesService } from '../badges/badges.service';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  async updateWatchProgress(userId: string, dto: UpdateProgressDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { module: true, quizzes: true },
    });

    if (!lesson) {
      throw new NotFoundException('Ders bulunamadı.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId: lesson.module.programId } },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bu derse erişiminiz yok.');
    }

    const percentage = lesson.durationSeconds && lesson.durationSeconds > 0
      ? Math.min(100, Math.round((dto.watchedSeconds / lesson.durationSeconds) * 100))
      : 0;

    const videoWatchedEnough = percentage >= 90;

    let quizPassed = true;
    if (lesson.quizzes.length > 0) {
      quizPassed = true;
      for (const quiz of lesson.quizzes) {
        const passedAttempt = await this.prisma.quizAttempt.findFirst({
          where: { userId, quizId: quiz.id, passed: true },
        });
        if (!passedAttempt) {
          quizPassed = false;
          break;
        }
      }
    }

    const shouldComplete = videoWatchedEnough && quizPassed;

    const progress = await this.prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      update: {
        progress: percentage,
        watchedSeconds: dto.watchedSeconds,
        completed: shouldComplete,
        programId: lesson.module.programId,
        moduleId: lesson.moduleId,
        lastAccessAt: new Date(),
      },
      create: {
        userId,
        lessonId: dto.lessonId,
        moduleId: lesson.moduleId,
        programId: lesson.module.programId,
        progress: percentage,
        watchedSeconds: dto.watchedSeconds,
        completed: shouldComplete,
      },
    });

    if (shouldComplete) {
      await this.checkModuleAndProgramCompletion(userId, lesson.moduleId, lesson.module.programId);

      const completedCount = await this.prisma.progress.count({
        where: { userId, completed: true },
      });
      await this.badgesService.checkAndGrant(userId, 'FIRST_LESSON', completedCount);
    }

    return progress;
  }

  private async checkModuleAndProgramCompletion(userId: string, moduleId: string, programId: string) {
    const lessonsInModule = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });

    let moduleCompleted = true;
    for (const lesson of lessonsInModule) {
      const p = await this.prisma.progress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });
      if (!p || !p.completed) {
        moduleCompleted = false;
        break;
      }
    }

    if (moduleCompleted) {
      await this.prisma.progress.upsert({
        where: { userId_lessonId: { userId, lessonId: `module:${moduleId}` } },
        update: { completed: true, progress: 100 },
        create: {
          userId,
          moduleId,
          programId,
          lessonId: `module:${moduleId}`,
          completed: true,
          progress: 100,
        },
      });
    }

    const allModules = await this.prisma.module.findMany({
      where: { programId },
      select: { id: true },
    });

    let programCompleted = true;
    for (const mod of allModules) {
      const lessonsInMod = await this.prisma.lesson.findMany({
        where: { moduleId: mod.id },
        select: { id: true },
      });

      for (const lesson of lessonsInMod) {
        const p = await this.prisma.progress.findUnique({
          where: { userId_lessonId: { userId, lessonId: lesson.id } },
        });
        if (!p || !p.completed) {
          programCompleted = false;
          break;
        }
      }
      if (!programCompleted) break;
    }

    return { moduleCompleted, programCompleted };
  }

  async findMine(userId: string) {
    return this.prisma.progress.findMany({
      where: { userId },
      orderBy: { lastAccessAt: 'desc' },
    });
  }

  async findByLesson(userId: string, lessonId: string) {
    return this.prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }
}
