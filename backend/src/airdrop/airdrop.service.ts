import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAirdropDto } from './dto/create-airdrop.dto';
import { UpdateAirdropDto } from './dto/update-airdrop.dto';
import { QueryAirdropDto } from './dto/query-airdrop.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class AirdropService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Turkce karakterleri de kapsayan basit bir kebab-case slug uretici - bu
  // kod tabaninda paylasilan bir slugify util'i yok (bkz. Page.slug, elle
  // admin tarafindan girilir), airdrop icin admin baslik yazip slug'i bos
  // birakabilsin diye burada yerel olarak uretiliyor.
  private slugify(text: string): string {
    const trMap: Record<string, string> = {
      ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
      ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
    };
    const normalized = text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => trMap[ch] ?? ch);
    return normalized
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const existing = await this.prisma.airdrop.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private buildWhere(query: QueryAirdropDto, forced?: Prisma.AirdropWhereInput): Prisma.AirdropWhereInput {
    const clauses: Prisma.AirdropWhereInput[] = [];
    if (forced) clauses.push(forced);
    if (query.blockchain) clauses.push({ blockchain: { equals: query.blockchain, mode: 'insensitive' } });
    if (query.category) clauses.push({ category: { equals: query.category, mode: 'insensitive' } });
    if (query.status) clauses.push({ status: query.status as any });
    if (query.difficulty) clauses.push({ difficulty: query.difficulty as any });
    if (query.requiresKYC !== undefined) clauses.push({ requiresKYC: query.requiresKYC });
    if (query.requiresWallet !== undefined) clauses.push({ requiresWallet: query.requiresWallet });
    if (query.minReward !== undefined) clauses.push({ estimatedValueUSD: { gte: query.minReward } });
    if (query.maxReward !== undefined) clauses.push({ estimatedValueUSD: { lte: query.maxReward } });
    if (query.q) {
      const q = query.q;
      clauses.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { projectName: { contains: q, mode: 'insensitive' } },
          { blockchain: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    return clauses.length > 0 ? { AND: clauses } : {};
  }

  // #Ads etiketli kayitlar (isAd:true) tarih/eklenme sirasindan bagimsiz olarak
  // HER ZAMAN listenin en ustunde (yani ilk sayfanin basinda) gorunmeli,
  // aralarinda en son eklenen en ustte. Bunu tek bir orderBy ile ifade etmek
  // (isAd desc + createdAt desc) normal (reklamsiz) kayitlarin kendi sirasini
  // (featured, sonra tarih) bozar - bu yuzden reklamli/reklamsiz iki ayri
  // sorgu calistirilip birlestiriliyor. Reklamlar sadece 1. sayfada, normal
  // sayfalamanin disinda (limit'ten dusulmez) gosterilir - kac reklam olursa
  // olsun "en ustte" konumu boylece tam olarak saglanir.
  private async paginate(where: Prisma.AirdropWhereInput, query: QueryAirdropDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const nonAdWhere: Prisma.AirdropWhereInput = { AND: [where, { isAd: false }] };
    const adWhere: Prisma.AirdropWhereInput = { AND: [where, { isAd: true }] };

    const [nonAdData, nonAdTotal, ads, adTotal] = await Promise.all([
      this.prisma.airdrop.findMany({
        where: nonAdWhere,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.airdrop.count({ where: nonAdWhere }),
      page === 1
        ? this.prisma.airdrop.findMany({ where: adWhere, orderBy: { createdAt: 'desc' } })
        : Promise.resolve([]),
      this.prisma.airdrop.count({ where: adWhere }),
    ]);

    const total = nonAdTotal + adTotal;
    return {
      data: [...ads, ...nonAdData],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query), query);
  }

  async findFeatured(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query, { featured: true }), query);
  }

  async findUpcoming(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query, { status: 'UPCOMING' }), query);
  }

  async findActive(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query, { status: 'ACTIVE' }), query);
  }

  async search(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query), query);
  }

  async filter(query: QueryAirdropDto) {
    return this.paginate(this.buildWhere(query), query);
  }

  async findBySlug(slug: string) {
    const airdrop = await this.prisma.airdrop.findUnique({ where: { slug } });
    if (!airdrop) {
      throw new NotFoundException('Airdrop bulunamadı.');
    }
    return airdrop;
  }

  async create(dto: CreateAirdropDto, actorId: string) {
    const baseSlug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.title);
    if (!baseSlug) {
      throw new BadRequestException('Geçerli bir başlık/slug girin.');
    }
    const slug = await this.ensureUniqueSlug(baseSlug);

    const created = await this.prisma.airdrop.create({
      data: {
        title: dto.title,
        slug,
        projectName: dto.projectName,
        blockchain: dto.blockchain,
        category: dto.category,
        logo: dto.logo,
        banner: dto.banner,
        description: dto.description,
        website: dto.website,
        twitter: dto.twitter,
        discord: dto.discord,
        telegram: dto.telegram,
        documentation: dto.documentation,
        status: (dto.status as any) ?? 'UPCOMING',
        rewardType: dto.rewardType,
        estimatedReward: dto.estimatedReward,
        estimatedValueUSD: dto.estimatedValueUSD,
        difficulty: (dto.difficulty as any) ?? 'MEDIUM',
        completionTime: dto.completionTime,
        requiresKYC: dto.requiresKYC ?? false,
        requiresWallet: dto.requiresWallet ?? false,
        requiresDiscord: dto.requiresDiscord ?? false,
        requiresTwitter: dto.requiresTwitter ?? false,
        requiresTelegram: dto.requiresTelegram ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        snapshotDate: dto.snapshotDate ? new Date(dto.snapshotDate) : undefined,
        claimDate: dto.claimDate ? new Date(dto.claimDate) : undefined,
        aiScore: dto.aiScore ?? 50,
        riskScore: dto.riskScore ?? 50,
        featured: dto.featured ?? false,
        isAd: dto.isAd ?? false,
        adExpiresAt: dto.adExpiresAt ? new Date(dto.adExpiresAt) : undefined,
      },
    });

    await this.auditLogService.log(actorId, 'AIRDROP_CREATE', 'Airdrop', created.id);
    return created;
  }

  async update(id: string, dto: UpdateAirdropDto, actorId: string) {
    const existing = await this.prisma.airdrop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Airdrop bulunamadı.');
    }

    let slug = existing.slug;
    if (dto.slug !== undefined || dto.title !== undefined) {
      const base = this.slugify(dto.slug ?? dto.title ?? existing.title);
      if (base && base !== existing.slug) {
        slug = await this.ensureUniqueSlug(base, id);
      }
    }

    const data: Prisma.AirdropUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      slug,
      ...(dto.projectName !== undefined && { projectName: dto.projectName }),
      ...(dto.blockchain !== undefined && { blockchain: dto.blockchain }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.logo !== undefined && { logo: dto.logo }),
      ...(dto.banner !== undefined && { banner: dto.banner }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.twitter !== undefined && { twitter: dto.twitter }),
      ...(dto.discord !== undefined && { discord: dto.discord }),
      ...(dto.telegram !== undefined && { telegram: dto.telegram }),
      ...(dto.documentation !== undefined && { documentation: dto.documentation }),
      ...(dto.status !== undefined && { status: dto.status as any }),
      ...(dto.rewardType !== undefined && { rewardType: dto.rewardType }),
      ...(dto.estimatedReward !== undefined && { estimatedReward: dto.estimatedReward }),
      ...(dto.estimatedValueUSD !== undefined && { estimatedValueUSD: dto.estimatedValueUSD }),
      ...(dto.difficulty !== undefined && { difficulty: dto.difficulty as any }),
      ...(dto.completionTime !== undefined && { completionTime: dto.completionTime }),
      ...(dto.requiresKYC !== undefined && { requiresKYC: dto.requiresKYC }),
      ...(dto.requiresWallet !== undefined && { requiresWallet: dto.requiresWallet }),
      ...(dto.requiresDiscord !== undefined && { requiresDiscord: dto.requiresDiscord }),
      ...(dto.requiresTwitter !== undefined && { requiresTwitter: dto.requiresTwitter }),
      ...(dto.requiresTelegram !== undefined && { requiresTelegram: dto.requiresTelegram }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.snapshotDate !== undefined && { snapshotDate: new Date(dto.snapshotDate) }),
      ...(dto.claimDate !== undefined && { claimDate: new Date(dto.claimDate) }),
      ...(dto.aiScore !== undefined && { aiScore: dto.aiScore }),
      ...(dto.riskScore !== undefined && { riskScore: dto.riskScore }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.isAd !== undefined && { isAd: dto.isAd }),
      ...(dto.adExpiresAt !== undefined && { adExpiresAt: new Date(dto.adExpiresAt) }),
    };

    const updated = await this.prisma.airdrop.update({ where: { id }, data });
    await this.auditLogService.log(actorId, 'AIRDROP_UPDATE', 'Airdrop', id);
    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.airdrop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Airdrop bulunamadı.');
    }
    await this.prisma.airdrop.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'AIRDROP_DELETE', 'Airdrop', id);
    return { message: 'Silindi.' };
  }

  // Harici API entegrasyonu yok (kullanici talebiyle kaldirildi) - tek otomatik
  // is, suresi gecmis (endDate < su an) ama hala UPCOMING/ACTIVE isaretli
  // kayitlari ENDED'e cekmek. Gunde bir kez yeterli, veri harici bir
  // kaynaktan degil sadece kendi endDate alanindan okunuyor.
  @Cron('0 3 * * *')
  async expireEnded() {
    const now = new Date();
    await this.prisma.airdrop.updateMany({
      where: { status: { in: ['UPCOMING', 'ACTIVE'] }, endDate: { lt: now } },
      data: { status: 'ENDED' },
    });
  }

  // #Ads suresi (adExpiresAt) gecen kayitlari normal siraya geri dondurur -
  // kayit SILINMEZ, sadece pinlenmis konumu kalkar. Dakikada bir calisir ki
  // sayac bittiginde kart en fazla ~1 dakika gecikmeyle normal siraya donsun.
  @Cron('* * * * *')
  async expireAds() {
    const now = new Date();
    await this.prisma.airdrop.updateMany({
      where: { isAd: true, adExpiresAt: { lt: now } },
      data: { isAd: false },
    });
  }
}
