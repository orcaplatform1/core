import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.program.findUnique({ where: { id } });
  }

  async create(data: any, actorId: string) {
    const created = await this.prisma.program.create({ data });
    await this.auditLogService.log(actorId, 'PROGRAM_CREATE', 'Program', created.id);
    return created;
  }

  async update(id: string, data: any, actorId: string) {
    const updated = await this.prisma.program.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'PROGRAM_UPDATE', 'Program', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.program.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'PROGRAM_DELETE', 'Program', id);
    return { message: 'Silindi.' };
  }
}
