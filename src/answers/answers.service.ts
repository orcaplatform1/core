import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AnswersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.answer.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.answer.findUnique({ where: { id } });
  }

  async create(data: { text: string; isCorrect?: boolean; questionId: string }, actorId: string) {
    const created = await this.prisma.answer.create({ data });
    await this.auditLogService.log(actorId, 'ANSWER_CREATE', 'Answer', created.id);
    return created;
  }

  async update(id: string, data: { text?: string; isCorrect?: boolean }, actorId: string) {
    const updated = await this.prisma.answer.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'ANSWER_UPDATE', 'Answer', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.answer.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'ANSWER_DELETE', 'Answer', id);
    return { message: 'Silindi.' };
  }
}
