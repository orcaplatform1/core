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
          heroSocialProofCount: '10.000+',
          heroSocialProofLabel: 'öğrenci ORCA topluluğunun bir parçası',
          heroImageUrl: '/core/marketing/orca-hero-whale.webp',
          statsItems: [
            { icon: 'users', value: '8.950+', trend: '+24%', label: 'Aktif Öğrenci', sublabel: 'Bu ay' },
            { icon: 'trending-up', value: '%89', trend: '+11%', label: 'Başarı Oranı', sublabel: 'Bu ay' },
            { icon: 'clock', value: '24/7', label: 'AI Mentor Desteği', sublabel: 'Sınırsız Destek' },
            { icon: 'graduation-cap', value: '50+', label: 'Uzman Eğitmen', sublabel: 'Alanında Uzman' },
          ],
          programsTableTitle: 'Programlarımız',
          programsTableItems: [
            { level: '🟢 Başlangıç', title: 'Finans Okuryazarlığı ve Servet Yönetimi', duration: '10 Saat' },
            { level: '🟢 Başlangıç', title: 'Kripto Para Piyasaları ve Blockchain Temelleri', duration: '8 Saat' },
            { level: '🟢 Başlangıç', title: 'Borsa İstanbul (BIST) Uzmanlık Programı', duration: '10 Saat' },
            { level: '🟢 Başlangıç', title: 'Forex Piyasaları Uzmanlık Programı', duration: '10 Saat' },
            { level: '🔵 Orta', title: 'Teknik Analiz ve Grafik Okuma', duration: '14 Saat' },
            { level: '🔵 Orta', title: 'Price Action ve Piyasa Yapısı', duration: '12 Saat' },
            { level: '🟣 İleri', title: 'ICT Core Concepts', duration: '10 Saat' },
            { level: '🟣 İleri', title: 'ICT Institutional Concepts', duration: '14 Saat' },
            { level: '🟣 İleri', title: 'ICT Advanced Execution & Model Library', duration: '12 Saat' },
            { level: '🟣 İleri', title: 'Wyckoff Metodu ve Smart Money Analizi', duration: '10 Saat' },
            {
              level: '🟠 İleri',
              title: 'Risk Yönetimi, Sermaye Yönetimi ve Trading Psikolojisi',
              duration: '8 Saat',
            },
            { level: '⭐ Uzman', title: 'Profesyonel Trade Planı ve Performans Geliştirme', duration: '8 Saat' },
          ],
          toolsTitle: 'ORCA Araçları',
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
          featuresTitle: 'Neden ORCA?',
          featuresSubtitle: 'Tek platformda ihtiyacın olan her şey.',
          featureItems: [
            { icon: 'bot', title: 'AI Araçları', description: '7/24 yanında, sana özel analiz ve strateji rehberi.' },
            {
              icon: 'graduation-cap',
              title: 'Eğitimler',
              description: 'Sıfırdan profesyonele uzanan özel hazırlanmış programlar.',
            },
            {
              icon: 'line-chart',
              title: 'Analiz Terminalleri',
              description: 'Backtest, simülasyon ve canlı piyasa taramasını tek ekranda yap.',
            },
            {
              icon: 'users',
              title: 'Topluluk',
              description: "Türkiye'nin en güçlü finans topluluğunun bir parçası ol.",
            },
            {
              icon: 'crown',
              title: 'ORCA Premium',
              description: 'Sınırsız AI Mentor, gelişmiş tarayıcı ve öncelikli destek.',
              accent: 'purple',
            },
          ],
          communityTitle: 'Güçlü Topluluk, Gerçek Başarılar',
          communityStats: [
            { icon: 'users', value: '10.000+', label: 'Topluluk Üyesi' },
            { icon: 'activity', value: '1.250+', label: 'Günlük Aktif' },
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

  async update(dto: UpdateSiteContentDto, actorId: string) {
    const existing = await this.get();

    const updated = await this.prisma.siteContentSettings.update({
      where: { id: existing.id },
      data: dto as any,
    });

    await this.auditLogService.log(actorId, 'SITE_CONTENT_UPDATE', 'SiteContentSettings', existing.id);
    return updated;
  }
}
