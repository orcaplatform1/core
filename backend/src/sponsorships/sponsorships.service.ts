import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { IcoTrackerService } from '../ico-tracker/ico-tracker.service';
import { AirdropService } from '../airdrop/airdrop.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';

type StatsRow = { type: string; revenue: number; count: number };

@Injectable()
export class SponsorshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly icoTrackerService: IcoTrackerService,
    private readonly airdropService: AirdropService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPricing() {
    return this.paymentsService.getSponsorshipPricingUsd();
  }

  // Basvuru formu, ilgili tipin admin panelindeki create DTO'suyla ayni sekle
  // sahip (isAd/adExpiresAt haric, onlar onay aninda otomatik set edilir) -
  // burada sadece o DTO'daki zorunlu alanlarin dolu geldigini dogruluyoruz,
  // asil tip/format dogrulamasi onay aninda IcoTrackerService/AirdropService'in
  // kendi create() metoduna girince (class-validator ile) yapilir.
  private validateFormData(type: 'ICO' | 'AIRDROP', formData: Record<string, unknown>) {
    const requiredFields = type === 'ICO' ? ['name'] : ['title', 'projectName', 'blockchain', 'category', 'rewardType'];
    for (const field of requiredFields) {
      const value = formData[field];
      if (typeof value !== 'string' || !value.trim()) {
        throw new BadRequestException(`Zorunlu alan eksik: ${field}`);
      }
    }
  }

  async create(userId: string, dto: CreateSponsorshipDto) {
    this.validateFormData(dto.type, dto.formData);
    const pricing = await this.getPricing();
    const priceUsd = pricing[dto.durationDays as 7 | 15 | 30];

    return this.prisma.sponsorship.create({
      data: {
        userId,
        type: dto.type as any,
        durationDays: dto.durationDays,
        priceUsd,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactTelegram: dto.contactTelegram,
        formData: dto.formData as any,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.sponsorship.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async adminList(status?: string) {
    return this.prisma.sponsorship.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, username: true, email: true } } },
    });
  }

  async approve(id: string, actorId: string, actorName: string) {
    const sponsorship = await this.prisma.sponsorship.findUnique({ where: { id } });
    if (!sponsorship) throw new NotFoundException('Sponsorluk başvurusu bulunamadı.');
    if (sponsorship.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Bu başvuru onay bekleyen durumda değil.');
    }

    // icoTrackerService.create/airdropService.create burada dogrudan cagriliyor
    // (HTTP katmani/ValidationPipe devrede degil), bu yuzden bos string birakilmis
    // opsiyonel alanlar (ornegin bos "Website" kutusu) IsUrl/IsOptional'i tetiklemeden
    // once elle temizlenir - IsOptional yalnizca undefined/null'i atlar, "" degil.
    const rawFormData = sponsorship.formData as Record<string, any>;
    const formData: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawFormData)) {
      formData[key] = value === '' ? undefined : value;
    }
    const adExpiresAt = new Date(Date.now() + sponsorship.durationDays * 24 * 60 * 60 * 1000).toISOString();

    let createdIcoId: string | undefined;
    let createdAirdropId: string | undefined;
    let listingLink: string;
    let listingName: string;

    if (sponsorship.type === 'ICO') {
      const created = await this.icoTrackerService.create({ ...formData, isAd: true, adExpiresAt } as any, actorId);
      createdIcoId = created.id;
      listingLink = `/tools/crypto/ico/${created.id}`;
      listingName = created.name;
    } else {
      const created = await this.airdropService.create({ ...formData, isAd: true, adExpiresAt } as any, actorId);
      createdAirdropId = created.id;
      listingLink = `/tools/crypto/airdrops/${created.slug}`;
      listingName = created.title;
    }

    const updated = await this.prisma.sponsorship.update({
      where: { id },
      data: {
        status: 'APPROVED',
        createdIcoId,
        createdAirdropId,
        reviewedAt: new Date(),
        reviewedByName: actorName,
      },
    });

    // Tur talebi geregi tum kullanicilara bildirim gitmeli - SYSTEM tipi (ANNOUNCEMENT
    // degil) kullaniliyor cunku ANNOUNCEMENT tipi bildirim ceki/zil listesinden
    // haric tutuluyor (bkz. NotificationsService.findMine), sponsor duyurusunun
    // ise normal bildirim listesinde kalici olarak gorunmesi gerekiyor.
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });
    await this.notificationsService.createForManyUsers(
      allUsers.map((u) => u.id),
      {
        type: 'SYSTEM' as any,
        title: sponsorship.type === 'ICO' ? 'Yeni ICO/IDO eklendi' : 'Yeni Airdrop eklendi',
        message: `${listingName} sponsorlu ilan olarak listeye eklendi.`,
        link: listingLink,
      },
    );

    return updated;
  }

  async reject(id: string, actorName: string, reason?: string) {
    const sponsorship = await this.prisma.sponsorship.findUnique({ where: { id } });
    if (!sponsorship) throw new NotFoundException('Sponsorluk başvurusu bulunamadı.');
    if (sponsorship.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Bu başvuru onay bekleyen durumda değil.');
    }

    return this.prisma.sponsorship.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedByName: actorName,
      },
    });
  }

  private shapeStatsRows(rows: StatsRow[]) {
    const ico = rows.find((r) => r.type === 'ICO');
    const airdrop = rows.find((r) => r.type === 'AIRDROP');
    return {
      ico: { revenueUsd: ico?.revenue ?? 0, count: ico?.count ?? 0 },
      airdrop: { revenueUsd: airdrop?.revenue ?? 0, count: airdrop?.count ?? 0 },
      total: {
        revenueUsd: (ico?.revenue ?? 0) + (airdrop?.revenue ?? 0),
        count: (ico?.count ?? 0) + (airdrop?.count ?? 0),
      },
    };
  }

  // Gelir USD olarak basvuru anindaki sabit fiyattan (Sponsorship.priceUsd) toplanir,
  // odemenin kilitlendigi kripto kurundaki dalgalanmadan (Payment.amount, TRY) etkilenmez.
  async getStats() {
    const [week, month, year] = await Promise.all([
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT s.type AS type, COALESCE(SUM(s."priceUsd"), 0)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p
        JOIN "Sponsorship" s ON s."paymentId" = p.id
        WHERE p.status = 'APPROVED' AND p.purpose = 'SPONSORSHIP'
          AND COALESCE(p."approvedAt", p."createdAt") >= date_trunc('week', NOW())
        GROUP BY s.type
      `,
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT s.type AS type, COALESCE(SUM(s."priceUsd"), 0)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p
        JOIN "Sponsorship" s ON s."paymentId" = p.id
        WHERE p.status = 'APPROVED' AND p.purpose = 'SPONSORSHIP'
          AND COALESCE(p."approvedAt", p."createdAt") >= date_trunc('month', NOW())
        GROUP BY s.type
      `,
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT s.type AS type, COALESCE(SUM(s."priceUsd"), 0)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p
        JOIN "Sponsorship" s ON s."paymentId" = p.id
        WHERE p.status = 'APPROVED' AND p.purpose = 'SPONSORSHIP'
          AND COALESCE(p."approvedAt", p."createdAt") >= date_trunc('year', NOW())
        GROUP BY s.type
      `,
    ]);

    return {
      thisWeek: this.shapeStatsRows(week),
      thisMonth: this.shapeStatsRows(month),
      thisYear: this.shapeStatsRows(year),
    };
  }
}
