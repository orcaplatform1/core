import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.quiz.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.quiz.findUnique({ where: { id } });
  }

  async create(data: { title: string; description?: string; lessonId: string; timeLimitMinutes?: number }, actorId: string) {
    const created = await this.prisma.quiz.create({ data });
    await this.auditLogService.log(actorId, 'QUIZ_CREATE', 'Quiz', created.id);
    return created;
  }

  async update(id: string, data: { title?: string; description?: string; timeLimitMinutes?: number }, actorId: string) {
    const updated = await this.prisma.quiz.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'QUIZ_UPDATE', 'Quiz', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.quiz.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'QUIZ_DELETE', 'Quiz', id);
    return { message: 'Silindi.' };
  }
}
