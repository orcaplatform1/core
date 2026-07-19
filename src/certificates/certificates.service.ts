import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkProgramCompleted(userId: string, programId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { programId } },
      select: { id: true },
    });

    const quizzes = await this.prisma.quiz.findMany({
      where: { lesson: { module: { programId } } },
      select: { id: true },
    });

    for (const lesson of lessons) {
      const progress = await this.prisma.progress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });

      if (!progress || !progress.completed) {
        return false;
      }
    }

    for (const quiz of quizzes) {
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: { userId, quizId: quiz.id, passed: true },
      });

      if (!passedAttempt) {
        return false;
      }
    }

    return true;
  }

  async issue(userId: string, dto: CreateCertificateDto) {
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_programId: { userId, programId: dto.programId } },
    });

    if (existing) {
      throw new BadRequestException('Bu program için sertifika zaten verilmiş.');
    }

    const isCompleted = await this.checkProgramCompleted(userId, dto.programId);

    if (!isCompleted) {
      throw new BadRequestException(
        'Sertifika alabilmek için programdaki tüm dersleri ve quizleri (geçer notla) tamamlamanız gerekiyor.',
      );
    }

    const created = await this.prisma.certificate.create({
      data: {
        userId,
        programId: dto.programId,
        code: 'PENDING',
      },
    });

    const code = `ORCA-${String(created.number).padStart(6, '0')}`;

    return this.prisma.certificate.update({
      where: { id: created.id },
      data: { code },
    });
  }

  async findAll() {
    return this.prisma.certificate.findMany({
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });

    if (!cert) {
      throw new NotFoundException('Sertifika bulunamadı.');
    }

    return cert;
  }

  async verify(code: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { code } });

    if (!cert) {
      return { valid: false };
    }

    const [user, program] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: cert.userId },
        select: { fullName: true },
      }),
      this.prisma.program.findUnique({
        where: { id: cert.programId },
        select: { title: true },
      }),
    ]);

    return {
      valid: true,
      code: cert.code,
      number: cert.number,
      studentName: user?.fullName,
      programTitle: program?.title,
      issuedAt: cert.issuedAt,
    };
  }

  async remove(id: string) {
    const exists = await this.prisma.certificate.findUnique({ where: { id } });

    if (!exists) {
      throw new BadRequestException('Sertifika bulunamadı.');
    }

    await this.prisma.certificate.delete({ where: { id } });

    return {
      message: 'Silindi.',
    };
  }
}
