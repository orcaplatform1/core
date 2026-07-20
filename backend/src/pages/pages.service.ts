import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.page.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async findFooterPages() {
    return this.prisma.page.findMany({
      where: { showInFooter: true },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true },
    });
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });

    if (!page) {
      throw new NotFoundException('Sayfa bulunamadı.');
    }

    return page;
  }

  async create(dto: CreatePageDto, actorId: string) {
    const exists = await this.prisma.page.findUnique({ where: { slug: dto.slug } });

    if (exists) {
      throw new BadRequestException('Bu slug zaten kullanılıyor.');
    }

    const created = await this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        showInFooter: dto.showInFooter ?? false,
        order: dto.order ?? 0,
      },
    });

    await this.auditLogService.log(actorId, 'PAGE_CREATE', 'Page', created.id);
    return created;
  }

  async update(id: string, dto: UpdatePageDto, actorId: string) {
    const updated = await this.prisma.page.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.log(actorId, 'PAGE_UPDATE', 'Page', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.prisma.page.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'PAGE_DELETE', 'Page', id);
    return { message: 'Silindi.' };
  }
}
