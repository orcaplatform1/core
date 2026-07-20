import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateCategoryDto, actorId: string) {
    const created = await this.prisma.category.create({
      data: { name: dto.name },
    });
    await this.auditLogService.log(actorId, 'CATEGORY_CREATE', 'Category', created.id);
    return created;
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Kategori bulunamadı.');
    }

    return category;
  }

  async remove(id: string, actorId: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });

    if (!exists) {
      throw new BadRequestException('Kategori bulunamadı.');
    }

    await this.prisma.category.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'CATEGORY_DELETE', 'Category', id);

    return { message: 'Silindi.' };
  }
}
