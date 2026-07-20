import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

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
      if (!progress || !progress.completed) return false;
    }

    for (const quiz of quizzes) {
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: { userId, quizId: quiz.id, passed: true },
      });
      if (!passedAttempt) return false;
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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const created = await this.prisma.certificate.create({
      data: {
        userId,
        programId: dto.programId,
        code: 'PENDING',
        studentName: user?.fullName ?? 'Öğrenci',
      },
    });

    const code = `ORCA-${String(created.number).padStart(6, '0')}`;

    return this.prisma.certificate.update({
      where: { id: created.id },
      data: { code },
    });
  }

  async findAll() {
    return this.prisma.certificate.findMany({ orderBy: { number: 'asc' } });
  }

  async findOne(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Sertifika bulunamadı.');
    return cert;
  }

  async verify(code: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { code } });
    if (!cert) return { valid: false };

    const program = await this.prisma.program.findUnique({
      where: { id: cert.programId },
      select: { title: true },
    });

    return {
      valid: true,
      code: cert.code,
      number: cert.number,
      studentName: cert.studentName,
      programTitle: program?.title,
      issuedAt: cert.issuedAt,
    };
  }

  async generatePdf(id: string, requestingUserId: string): Promise<Buffer> {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });

    if (!cert) throw new NotFoundException('Sertifika bulunamadı.');

    if (cert.userId !== requestingUserId) {
      const requester = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
      if (requester?.role !== 'SUPER_ADMIN') {
        throw new BadRequestException('Bu sertifikayı görüntüleme yetkiniz yok.');
      }
    }

    const program = await this.prisma.program.findUnique({
      where: { id: cert.programId },
      select: { title: true },
    });

    const verifyUrl = `https://traders.tr/verify/${cert.code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#050b16');

      doc
        .fillColor('#ffffff')
        .fontSize(36)
        .font('Helvetica-Bold')
        .text('ORCA', 0, 60, { align: 'center' });

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#a0aec0')
        .text('Yeni Nesil Finans Eğitim Platformu', 0, 105, { align: 'center' });

      doc
        .fontSize(28)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('Başarı Sertifikası', 0, 160, { align: 'center' });

      doc
        .fontSize(16)
        .fillColor('#cbd5e0')
        .font('Helvetica')
        .text('Bu sertifika,', 0, 220, { align: 'center' });

      doc
        .fontSize(26)
        .fillColor('#4299e1')
        .font('Helvetica-Bold')
        .text(cert.studentName ?? 'Öğrenci', 0, 250, { align: 'center' });

      doc
        .fontSize(16)
        .fillColor('#cbd5e0')
        .font('Helvetica')
        .text(`kişisinin "${program?.title ?? 'Program'}" programını başarıyla tamamladığını belgeler.`, 80, 295, {
          align: 'center',
          width: doc.page.width - 160,
        });

      doc
        .fontSize(11)
        .fillColor('#718096')
        .text(`Sertifika No: ${cert.code}`, 80, 400)
        .text(`Veriliş Tarihi: ${cert.issuedAt.toLocaleDateString('tr-TR')}`, 80, 418);

      doc.image(qrBuffer, doc.page.width - 200, 340, { width: 120 });
      doc
        .fontSize(9)
        .fillColor('#718096')
        .text('Doğrulamak için taratın', doc.page.width - 200, 465, { width: 120, align: 'center' });

      doc.end();
    });
  }
}
