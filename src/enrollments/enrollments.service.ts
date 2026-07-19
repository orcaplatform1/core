import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, dto: CreateEnrollmentDto) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId: dto.programId } },
    });

    if (existing) {
      throw new BadRequestException('Bu programa zaten sahipsiniz.');
    }

    return this.prisma.enrollment.create({
      data: {
        userId,
        programId: dto.programId,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasAccess(userId: string, programId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId } },
    });

    return !!enrollment;
  }

  async findAll() {
    return this.prisma.enrollment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });

    if (!enrollment) {
      throw new NotFoundException('Kayıt bulunamadı.');
    }

    return enrollment;
  }

  async remove(id: string) {
    const exists = await this.prisma.enrollment.findUnique({ where: { id } });

    if (!exists) {
      throw new BadRequestException('Kayıt bulunamadı.');
    }

    await this.prisma.enrollment.delete({ where: { id } });

    return { message: 'Silindi.' };
  }
}
