import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.question.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.question.findUnique({ where: { id } });
  }

  async create(data: { title: string; description?: string; explanation?: string; quizId: string }, actorId: string) {
    const created = await this.prisma.question.create({ data });
    await this.auditLogService.log(actorId, 'QUESTION_CREATE', 'Question', created.id);
    return created;
  }

  async update(id: string, data: { title?: string; description?: string; explanation?: string }, actorId: string) {
    const updated = await this.prisma.question.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'QUESTION_UPDATE', 'Question', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.question.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'QUESTION_DELETE', 'Question', id);
    return { message: 'Silindi.' };
  }
}
