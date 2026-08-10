import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { StatsService } from '../stats/stats.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSuccessStoryDto } from './dto/create-success-story.dto';

const ELIGIBLE_QUIZ_SUCCESS_RATE = 95;

@Injectable()
export class SuccessStoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
    private readonly statsService: StatsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async checkEligibility(userId: string) {
    const [certStatus, stats] = await Promise.all([
      this.certificatesService.getMyStatus(userId),
      this.statsService.getMyStats(userId),
    ]);
    const graduated = certStatus.hasCertificate;
    const eligible = graduated && stats.quizSuccessRate >= ELIGIBLE_QUIZ_SUCCESS_RATE;
    return { eligible, graduated, quizSuccessRate: stats.quizSuccessRate };
  }

  async getMine(userId: string) {
    const [eligibility, story] = await Promise.all([
      this.checkEligibility(userId),
      this.prisma.successStory.findUnique({ where: { userId } }),
    ]);
    return { ...eligibility, story };
  }

  async submit(userId: string, dto: CreateSuccessStoryDto) {
    const existing = await this.prisma.successStory.findUnique({ where: { userId } });
    if (existing && existing.status !== 'REJECTED') {
      throw new BadRequestException(
        existing.status === 'PENDING'
          ? 'Hikayen zaten incelemede.'
          : 'Zaten yayında bir başarı hikayen var.',
      );
    }
    const { eligible } = await this.checkEligibility(userId);
    if (!eligible) {
      throw new BadRequestException(
        'Başarı hikayesi paylaşabilmek için mezun olman ve quiz başarı oranının %95 ve üzerinde olması gerekiyor.',
      );
    }
    if (existing) {
      return this.prisma.successStory.update({
        where: { userId },
        data: {
          title: dto.title,
          content: dto.content,
          status: 'PENDING',
          rejectionReason: null,
          moderatedAt: null,
        },
      });
    }
    return this.prisma.successStory.create({
      data: { userId, title: dto.title, content: dto.content },
    });
  }

  async listPublic() {
    return this.prisma.successStory.findMany({
      where: { status: 'APPROVED' },
      orderBy: { moderatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        moderatedAt: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async listForModeration(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.successStory.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async moderate(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason: string | undefined, actorId: string) {
    const story = await this.prisma.successStory.findUnique({ where: { id } });
    if (!story) throw new NotFoundException('Başarı hikayesi bulunamadı.');
    const updated = await this.prisma.successStory.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? (rejectionReason ?? null) : null,
        moderatedAt: new Date(),
      },
    });
    await this.auditLogService.log(actorId, `SUCCESS_STORY_${status}`, 'SuccessStory', id);
    return updated;
  }

  async removeMine(userId: string) {
    const story = await this.prisma.successStory.findUnique({ where: { userId } });
    if (!story) throw new NotFoundException('Başarı hikayen yok.');
    await this.prisma.successStory.delete({ where: { userId } });
    return { message: 'Silindi.' };
  }
}
