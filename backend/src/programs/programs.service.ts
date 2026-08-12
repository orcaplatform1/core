import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { slugify } from '../common/slugify';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // SEO icin okunakli slug'lar tercih edilir ama eski id bazli linkler de
  // (paylasilmis linkler, sitemap gecmisi) calismaya devam etmeli - once slug'a
  // bakiyoruz, bulunamazsa id olarak deniyoruz.
  async findBySlugOrId(slugOrId: string) {
    const bySlug = await this.prisma.program.findUnique({ where: { slug: slugOrId } });
    if (bySlug) return bySlug;
    return this.prisma.program.findUnique({ where: { id: slugOrId } });
  }

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title) || 'program';
    let candidate = base;
    let n = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.program.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${base}-${n}`;
      n++;
    }
  }

  async create(data: any, actorId: string) {
    const slug = data.slug ? slugify(data.slug) : await this.uniqueSlug(data.title);
    const created = await this.prisma.program.create({ data: { ...data, slug } });
    await this.auditLogService.log(actorId, 'PROGRAM_CREATE', 'Program', created.id);
    return created;
  }

  async update(id: string, data: any, actorId: string) {
    const nextData = { ...data };
    if (data.slug) {
      nextData.slug = await this.uniqueSlug(data.slug, id);
    }
    const updated = await this.prisma.program.update({ where: { id }, data: nextData });
    await this.auditLogService.log(actorId, 'PROGRAM_UPDATE', 'Program', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.program.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'PROGRAM_DELETE', 'Program', id);
    return { message: 'Silindi.' };
  }
}
