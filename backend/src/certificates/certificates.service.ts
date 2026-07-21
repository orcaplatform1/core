import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  /** Kullanıcının sahip olduğu (enrollment) TÜM programları tamamlayıp tamamlamadığını kontrol eder. */
  async checkGraduationEligible(userId: string): Promise<{ eligible: boolean; totalPrograms: number; completedPrograms: number }> {
    const enrollments = await this.prisma.enrollment.findMany({ where: { userId } });
    if (enrollments.length === 0) {
      return { eligible: false, totalPrograms: 0, completedPrograms: 0 };
    }
    let completedCount = 0;
    for (const enrollment of enrollments) {
      const done = await this.checkProgramCompleted(userId, enrollment.programId);
      if (done) completedCount++;
    }
    return {
      eligible: completedCount === enrollments.length,
      totalPrograms: enrollments.length,
      completedPrograms: completedCount,
    };
  }

  async getMyStatus(userId: string) {
    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    if (existing) {
      return { hasCertificate: true, certificate: existing };
    }
    const { eligible, totalPrograms, completedPrograms } = await this.checkGraduationEligible(userId);
    return { hasCertificate: false, eligible, totalPrograms, completedPrograms };
  }

  async issue(userId: string) {
    const existing = await this.prisma.certificate.findUnique({ where: { userId } });
    if (existing) {
      throw new BadRequestException('Zaten bir mezuniyet sertifikanız var.');
    }
    const { eligible } = await this.checkGraduationEligible(userId);
    if (!eligible) {
      throw new BadRequestException(
        'Sertifika alabilmek için sahip olduğun tüm programlardaki dersleri ve quizleri (geçer notla) tamamlaman gerekiyor.',
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const created = await this.prisma.certificate.create({
      data: {
        userId,
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
    return {
      valid: true,
      code: cert.code,
      number: cert.number,
      studentName: cert.studentName,
      programTitle: 'ORCA Finans Eğitim Programı — Tüm Modüller',
      issuedAt: cert.issuedAt,
    };
  }

  async generatePdf(id: string, requestingUserId: string): Promise<Buffer> {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Sertifika bulunamadı.');
    if (cert.userId !== requestingUserId) {
      throw new BadRequestException('Bu sertifikaya erişim yetkiniz yok.');
    }
    const qrDataUrl = await QRCode.toDataURL(`https://traders.tr/core/verify/${cert.code}`);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#060B16');
      doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold').text('ORCA TRADERS', 0, 80, { align: 'center' });
      doc.fillColor('#4F6BFF').fontSize(16).text('Mezuniyet Sertifikası', { align: 'center' });
      doc.moveDown(2);
      doc.fillColor('#FFFFFF').fontSize(22).text(cert.studentName ?? 'Öğrenci', { align: 'center' });
      doc.fillColor('#B7C0D6').fontSize(12).text('ORCA TRADERS Finans Eğitim Programının tamamını başarıyla tamamlamıştır.', { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#7C8BA8').fontSize(10).text(`Sertifika No: ${cert.code}`, { align: 'center' });
      doc.text(
        `Veriliş Tarihi: ${cert.issuedAt.toLocaleDateString('tr-TR')}`,
        { align: 'center' },
      );
      doc.image(qrDataUrl, doc.page.width - 150, doc.page.height - 150, { width: 80 });
      doc.end();
    });
  }
}
