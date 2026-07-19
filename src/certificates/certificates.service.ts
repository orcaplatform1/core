import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, dto: CreateCertificateDto) {
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_programId: { userId, programId: dto.programId } },
    });

    if (existing) {
      throw new BadRequestException('Bu program için sertifika zaten verilmiş.');
    }

    const code = `ORCA-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.certificate.create({
      data: {
        userId,
        programId: dto.programId,
        code,
      },
    });
  }

  async findAll() {
    return this.prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });

    if (!cert) {
      throw new NotFoundException('Sertifika bulunamadı.');
    }

    return cert;
  }

  async remove(id: string) {
    const exists = await this.prisma.certificate.findUnique({ where: { id } });

    if (!exists) {
      throw new BadRequestException('Sertifika bulunamadı.');
    }

    await this.prisma.certificate.delete({ where: { id } });

    return { message: 'Silindi.' };
  }
}
