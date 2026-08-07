import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateFooterDto } from './dto/update-footer.dto';

@Injectable()
export class FooterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async get() {
    let settings = await this.prisma.footerSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.footerSettings.create({
        data: {
          companyName: 'ORCA',
          copyrightText: '© 2026 ORCA. Tüm hakları saklıdır. Bu platformda yer alan tüm içerikler, tasarımlar, marka unsurları ve fikrî mülkiyet hakları ilgili yasal mevzuat kapsamında korunmaktadır.',
          legalDisclaimer:
            'Yasal Uyarı: Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Bu görüşler mali durumunuz ile risk ve getiri tercihlerinize uygun olmayabilir. Sadece burada yer alan bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun sonuçlar doğurmayabilir. Sitedeki verilerin doğruluğu ve kullanımından doğabilecek zararlardan sitemiz sorumlu değildir.',
        },
      });
    }

    return settings;
  }

  async update(dto: UpdateFooterDto, actorId: string) {
    const existing = await this.get();

    const updated = await this.prisma.footerSettings.update({
      where: { id: existing.id },
      data: dto as any,
    });

    await this.auditLogService.log(actorId, 'FOOTER_UPDATE', 'FooterSettings', existing.id);
    return updated;
  }
}
