import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IcoProject } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateIcoProjectDto } from './dto/create-ico-project.dto';
import { UpdateIcoProjectDto } from './dto/update-ico-project.dto';

// ICObench API entegrasyonu kaldirildi (kullanici talebiyle) - tum ICO/IDO
// kayitlari artik admin panelden manuel eklenir, icodrops.com'daki lansman
// bilgisi tarzinda (launchpad, katilim linki, satis tipi vb.).
@Injectable()
export class IcoTrackerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // #Ads etiketli kayitlar tarih/durumdan bagimsiz olarak listenin en ustunde
  // (aralarinda en son eklenen ustte) gorunmeli - normal siralamayi (durum,
  // sonra tarih) bozmadan bunu saglamak icin iki ayri sorgu birlestirilir
  // (bkz. AirdropService.paginate'teki ayni gerekce).
  async getIcos(): Promise<IcoProject[]> {
    const [ads, rest] = await Promise.all([
      this.prisma.icoProject.findMany({ where: { isAd: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.icoProject.findMany({
        where: { isAd: false },
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }, { raisedAmountUsd: 'desc' }],
      }),
    ]);
    return [...ads, ...rest];
  }

  async create(dto: CreateIcoProjectDto, actorId: string) {
    const created = await this.prisma.icoProject.create({
      data: {
        name: dto.name,
        tokenSymbol: dto.tokenSymbol,
        status: (dto.status as any) ?? 'UPCOMING',
        raisedAmountUsd: dto.raisedAmountUsd,
        ratingScore: dto.ratingScore,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        websiteUrl: dto.websiteUrl,
        description: dto.description,
        logo: dto.logo,
        blockchain: dto.blockchain,
        category: dto.category,
        saleType: dto.saleType,
        launchpad: dto.launchpad,
        launchpadUrl: dto.launchpadUrl,
        tokenPrice: dto.tokenPrice,
        hardCapUsd: dto.hardCapUsd,
        valuationUsd: dto.valuationUsd,
        allocationDetails: dto.allocationDetails,
        requiresKYC: dto.requiresKYC ?? false,
        requiresWhitelist: dto.requiresWhitelist ?? false,
        twitter: dto.twitter,
        telegram: dto.telegram,
        discord: dto.discord,
        isAd: dto.isAd ?? false,
        adExpiresAt: dto.adExpiresAt ? new Date(dto.adExpiresAt) : undefined,
      },
    });
    await this.auditLogService.log(actorId, 'ICO_CREATE', 'IcoProject', created.id);
    return created;
  }

  async update(id: string, dto: UpdateIcoProjectDto, actorId: string) {
    const existing = await this.prisma.icoProject.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('ICO/IDO projesi bulunamadı.');
    }

    const updated = await this.prisma.icoProject.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tokenSymbol !== undefined && { tokenSymbol: dto.tokenSymbol }),
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.raisedAmountUsd !== undefined && { raisedAmountUsd: dto.raisedAmountUsd }),
        ...(dto.ratingScore !== undefined && { ratingScore: dto.ratingScore }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.blockchain !== undefined && { blockchain: dto.blockchain }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.saleType !== undefined && { saleType: dto.saleType }),
        ...(dto.launchpad !== undefined && { launchpad: dto.launchpad }),
        ...(dto.launchpadUrl !== undefined && { launchpadUrl: dto.launchpadUrl }),
        ...(dto.tokenPrice !== undefined && { tokenPrice: dto.tokenPrice }),
        ...(dto.hardCapUsd !== undefined && { hardCapUsd: dto.hardCapUsd }),
        ...(dto.valuationUsd !== undefined && { valuationUsd: dto.valuationUsd }),
        ...(dto.allocationDetails !== undefined && { allocationDetails: dto.allocationDetails }),
        ...(dto.requiresKYC !== undefined && { requiresKYC: dto.requiresKYC }),
        ...(dto.requiresWhitelist !== undefined && { requiresWhitelist: dto.requiresWhitelist }),
        ...(dto.twitter !== undefined && { twitter: dto.twitter }),
        ...(dto.telegram !== undefined && { telegram: dto.telegram }),
        ...(dto.discord !== undefined && { discord: dto.discord }),
        ...(dto.isAd !== undefined && { isAd: dto.isAd }),
        ...(dto.adExpiresAt !== undefined && { adExpiresAt: new Date(dto.adExpiresAt) }),
      },
    });
    await this.auditLogService.log(actorId, 'ICO_UPDATE', 'IcoProject', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.icoProject.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('ICO/IDO projesi bulunamadı.');
    }
    await this.prisma.icoProject.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'ICO_DELETE', 'IcoProject', id);
    return { message: 'Silindi.' };
  }

  // #Ads suresi (adExpiresAt) gecen kayitlari normal siraya geri dondurur -
  // kayit SILINMEZ, sadece pinlenmis konumu kalkar (bkz. AirdropService'teki
  // ayni gerekce).
  @Cron('* * * * *')
  async expireAds() {
    const now = new Date();
    await this.prisma.icoProject.updateMany({
      where: { isAd: true, adExpiresAt: { lt: now } },
      data: { isAd: false },
    });
  }
}
