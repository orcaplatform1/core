import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';

@Injectable()
export class SiteContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async get() {
    const settings = await this.findOrCreate();
    return this.withComputedCommunityStats(settings);
  }

  private async findOrCreate() {
    let settings = await this.prisma.siteContentSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.siteContentSettings.create({
        data: {
          navLinks: [
            { label: 'Ana Sayfa', href: '/' },
            { label: 'Programlar', href: '/programs' },
            { label: 'AI Mentor', href: '/mentor' },
            { label: 'Araçlar', href: '/manage/scanner' },
            { label: 'Topluluk', href: '/programs' },
            { label: 'Blog', href: '/blog' },
            { label: 'Hakkımızda', href: '/about' },
          ],
          heroBadge: 'Yeni Nesil Finans Eğitim Platformu',
          heroSecondaryCtaLabel: 'Tanıtım Videosu',
          heroSecondaryCtaHref: '/programs',
          heroImageUrl: '/core/marketing/orca-hero-whale.webp',
          partnersTitle: 'Güvenilen Teknoloji & Veri Ortakları',
          partnersItems: [
            { icon: 'line-chart', name: 'Binance' },
            { icon: 'activity', name: 'TradingView' },
            { icon: 'trending-up', name: 'CoinMarketCap' },
            { icon: 'radar', name: 'Coinglass' },
            { icon: 'zap', name: 'NewsAPI' },
            { icon: 'waypoints', name: 'TradingEconomics' },
          ],
          featuredProgramIds: [
            'cms1o20sk0000krc3ib8ipuvb', // Finans Okuryazarlığı ve Servet Yönetimi
            'cms1o219s002zkrc3ynaag4cb', // Kripto Para ve Blockchain Uzmanlığı
            'cms1o21k6004mkrc3xyzwu1zs', // Borsa İstanbul Uzmanlık Programı
            'cms1o21oz005tkrc3z23myfjl', // Forex Uzmanlık Programı
            'cms1o21t8006kkrc3b5qr0xrp', // Teknik Analiz
            'cms1o227q009gkrc364j9ot48', // ICT Foundations
          ],
          platformShowcase: {
            eyebrow: 'Gerçek Platform Deneyimi',
            title: 'Tüm İhtiyacın Olan Araçlar Tek Platformda.',
            description: 'Analiz et, test et, öğren ve geliş. ORCA ile piyasalarda bir adım önde ol.',
            ctaLabel: 'Platformu Keşfet',
            ctaHref: '/register',
            imageUrl: null,
            phoneImageUrl: null,
          },
          whyOrcaTitle: 'Neden ORCA?',
          whyOrcaItems: [
            {
              slug: '1',
              badgeLabel: 'ÜCRETSİZ',
              badgeColor: '#32D66B',
              icon: 'wrench',
              imageUrl: null,
              title: 'Araçlar',
              description: 'Kripto, forex, BIST100 ve ekonomik takvim tek panelde',
              href: '/tools',
            },
            {
              slug: '2',
              badgeLabel: 'ÜCRETSİZ',
              badgeColor: '#355CFF',
              icon: 'users',
              imageUrl: null,
              title: 'Canlı Topluluk',
              description: "Diğer öğrencilerin analiz ve setup'larını paylaştığı, TradingView tarzı aktif bir ortam",
              href: '/community',
            },
            {
              slug: '3',
              badgeLabel: 'EĞİTİM',
              badgeColor: '#F39C3D',
              icon: 'graduation-cap',
              imageUrl: null,
              title: 'Başlangıçtan Uzman Seviyeye Eğitim ve Sertifika',
              description: 'Başlangıç, Orta Seviye, İleri ve Uzman seviyelerini kapsayan yapılandırılmış müfredat',
              href: '/programs',
            },
            {
              slug: '4',
              badgeLabel: 'AI',
              badgeColor: '#8A54FF',
              icon: 'bot',
              imageUrl: null,
              title: 'ORCA AI Mentor',
              description: 'Kişiselleştirilmiş, 7/24 erişilebilir yapay zekâ destekli eğitim asistanı',
              href: '/subscription',
            },
            {
              slug: '5',
              badgeLabel: 'PRATİK',
              badgeColor: '#D9A441',
              icon: 'activity',
              imageUrl: null,
              title: 'Anlık Piyasa Verisiyle Pratik',
              description: 'Backtest ve Simülasyon modülleriyle, gerçek para riski olmadan strateji test et',
              href: '/subscription',
            },
            {
              slug: '6',
              badgeLabel: 'CANLI',
              badgeColor: '#EC5FA0',
              icon: 'message-square',
              imageUrl: null,
              title: 'Canlı Dersler',
              description: 'Eğitmenlerle gerçek zamanlı etkileşim, sorularını anında sor',
              href: '/subscription',
            },
          ],
          toolsTitle: 'Öne Çıkan Araçlar',
          toolsSubtitle:
            'Yapay zeka destekli araçlarımızla piyasayı daha iyi analiz edin, stratejinizi geliştirin ve bir adım önde olun.',
          toolsItems: [
            {
              icon: 'radar',
              title: 'AI Piyasa Tarayıcı',
              description: "Anlık tarama ile en güçlü setup'ları yakala.",
              href: '/manage/scanner',
              previewKey: 'scanner',
            },
            {
              icon: 'line-chart',
              title: 'Backtest Simulator',
              description: 'Stratejini geçmiş veriler üzerinde test et.',
              href: '/backtest',
              previewKey: 'backtest',
            },
            {
              icon: 'waypoints',
              title: 'İleri Simülasyon',
              description: 'Gerçek piyasa koşullarında risk almadan öğren.',
              href: '/simulation',
              previewKey: 'simulation',
            },
            {
              icon: 'calendar-clock',
              title: 'Ekonomik Takvim',
              description: 'Önemli verileri ve piyasa etkilerini takip et.',
              href: '/programs',
              previewKey: 'calendar',
            },
            {
              icon: 'activity',
              title: 'Canlı Piyasa Analizi',
              description: 'AI destekli anlık piyasa analizleri ve yorumlar.',
              href: '/mentor',
              previewKey: 'live',
            },
          ],
          communityTitle: 'Güçlü Topluluk, Gerçek Başarılar',
          communityStats: [
            { icon: 'users', value: '0', label: 'Topluluk Üyesi', auto: 'totalUsers' },
            { icon: 'activity', value: '0', label: 'Günlük Aktif', auto: 'dailyActive' },
            { icon: 'trophy', value: '285+', label: 'Başarı Hikayesi' },
            { icon: 'smile', value: '%98', label: 'Memnuniyet Oranı' },
          ],
          communityExtraCount: 12,
          ctaTitle: 'Doğru topluluk. Güçlü araçlar. Sınırsız öğrenme.',
          ctaDescription: 'ORCA ile finansal geleceğini bugün inşa et.',
          ctaButtonLabel: 'Hemen Başla',
          ctaButtonHref: '/register',
          ctaChecklist: [],
        },
      });
    }

    return settings;
  }

  private async withComputedCommunityStats(settings: { communityStats: unknown }) {
    const stats = (settings.communityStats as { auto?: string }[] | null) ?? [];
    if (!stats.some((s) => s?.auto)) return settings;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalUsers, dailyActive] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: 'GUEST' } } }),
      this.prisma.user.count({
        where: {
          role: { not: 'GUEST' },
          OR: [{ lastActivityDate: { gte: dayAgo } }, { lastLoginAt: { gte: dayAgo } }],
        },
      }),
    ]);

    const communityStats = stats.map((s) => {
      if (s?.auto === 'totalUsers') return { ...s, value: String(totalUsers) };
      if (s?.auto === 'dailyActive') return { ...s, value: String(dailyActive) };
      return s;
    });

    return { ...settings, communityStats };
  }

  async update(dto: UpdateSiteContentDto, actorId: string) {
    const existing = await this.findOrCreate();

    const updated = await this.prisma.siteContentSettings.update({
      where: { id: existing.id },
      data: dto as any,
    });

    await this.auditLogService.log(actorId, 'SITE_CONTENT_UPDATE', 'SiteContentSettings', existing.id);
    return updated;
  }
}
