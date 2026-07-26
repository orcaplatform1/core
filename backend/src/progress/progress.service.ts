import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { BadgesService } from '../badges/badges.service';

type ProgramLevel = 'BASLANGIC' | 'ORTA' | 'ILERI';

const LEVEL_RANK: Record<ProgramLevel, number> = { BASLANGIC: 0, ORTA: 1, ILERI: 2 };
const BYPASS_ROLES = ['SUPER_ADMIN', 'STAFF'];

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  /** Kullanıcının bir programdaki tüm derslerin videosunu izleyip izlemediğini ve o derslerdeki
   * tüm quizleri geçip geçmediğini kontrol eder. */
  async isProgramCompleted(userId: string, programId: string): Promise<boolean> {
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { programId } },
      select: { id: true },
    });
    const quizzes = await this.prisma.quiz.findMany({
      where: { lesson: { module: { programId } } },
      select: { id: true },
    });
    for (const lesson of lessons) {
      const progress = await this.prisma.progress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });
      if (!progress || !progress.completed) return false;
    }
    for (const quiz of quizzes) {
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: { userId, quizId: quiz.id, passed: true },
      });
      if (!passedAttempt) return false;
    }
    return true;
  }

  /** Bir seviyedeki programlara erişim için, kullanıcının kayıtlı olduğu ALT seviyelerdeki
   * tüm programları tamamlamış olması gerekir. Seviyesiz (null) programlar kilitlenmez. */
  async isLevelUnlocked(userId: string, level: ProgramLevel | null): Promise<boolean> {
    if (!level) return true;
    const rank = LEVEL_RANK[level];
    if (rank === 0) return true;

    const priorLevels = (Object.keys(LEVEL_RANK) as ProgramLevel[]).filter((l) => LEVEL_RANK[l] < rank);
    const priorPrograms = await this.prisma.program.findMany({
      where: { level: { in: priorLevels } },
      select: { id: true },
    });
    const enrolledPrior = await this.prisma.enrollment.findMany({
      where: { userId, programId: { in: priorPrograms.map((p) => p.id) } },
      select: { programId: true },
    });
    for (const { programId } of enrolledPrior) {
      if (!(await this.isProgramCompleted(userId, programId))) return false;
    }
    return true;
  }

  async updateWatchProgress(userId: string, dto: UpdateProgressDto, role?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { module: { include: { program: true } }, quizzes: true },
    });

    if (!lesson) {
      throw new NotFoundException('Ders bulunamadı.');
    }

    if (!role || !BYPASS_ROLES.includes(role)) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_programId: { userId, programId: lesson.module.programId } },
      });

      if (!enrollment) {
        throw new ForbiddenException('Bu derse erişiminiz yok.');
      }

      const unlocked = await this.isLevelUnlocked(userId, lesson.module.program.level);
      if (!unlocked) {
        throw new ForbiddenException({
          code: 'LEVEL_LOCKED',
          message: 'Bir önceki seviyedeki programları başarıyla tamamlamadan bu programa erişim sağlayamazsınız.',
        });
      }
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
