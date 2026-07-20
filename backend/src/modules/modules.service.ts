import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.module.findMany({
      orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }

  async create(data: { title: string; description?: string; programId: string; order?: number }, actorId: string) {
    const created = await this.prisma.module.create({ data });
    await this.auditLogService.log(actorId, 'MODULE_CREATE', 'Module', created.id);
    return created;
  }

  async update(id: string, data: { title?: string; description?: string; order?: number }, actorId: string) {
    const updated = await this.prisma.module.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'MODULE_UPDATE', 'Module', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.module.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'MODULE_DELETE', 'Module', id);
    return { message: 'Silindi.' };
  }

  async isUnlocked(userId: string, moduleId: string): Promise<boolean> {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });

    if (!module) return false;

    const previousModule = await this.prisma.module.findFirst({
      where: { programId: module.programId, order: { lt: module.order } },
      orderBy: { order: 'desc' },
    });

    if (!previousModule) return true;

    const quizzesInPreviousModule = await this.prisma.quiz.findMany({
      where: { lesson: { moduleId: previousModule.id } },
    });

    if (quizzesInPreviousModule.length === 0) return true;

    for (const quiz of quizzesInPreviousModule) {
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: { userId, quizId: quiz.id, passed: true },
      });

      if (!passedAttempt) return false;
    }

    return true;
  }
}
