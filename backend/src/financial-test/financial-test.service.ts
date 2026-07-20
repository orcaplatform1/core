import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestDto } from './dto/submit-test.dto';

const PROGRAM_BY_PROFILE: Record<string, string> = {
  BASLANGIC: 'Finansal Piyasaların Temelleri',
  ORTA: 'Teknik Analiz',
  ILERI: 'ICT Metodu',
  UZMAN: 'İleri Piyasa Analizi',
};

const PROFILE_LABEL: Record<string, string> = {
  BASLANGIC: 'Başlangıç Seviyesi',
  ORTA: 'Orta Seviye',
  ILERI: 'İleri Seviye',
  UZMAN: 'Uzman Seviyesi',
};

@Injectable()
export class FinancialTestService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateProfile(answers: number[]): string {
    const total = answers.reduce((sum, a) => sum + a, 0);

    if (total <= 5) return 'BASLANGIC';
    if (total <= 10) return 'ORTA';
    if (total <= 15) return 'ILERI';
    return 'UZMAN';
  }

  async submit(dto: SubmitTestDto) {
    const profile = this.calculateProfile(dto.answers);
    const recommendedProgram = PROGRAM_BY_PROFILE[profile];
    const profileLabel = PROFILE_LABEL[profile];

    let discountInfo: { staffName: string; discountRate: number } | null = null;

    if (dto.staffPromoCode) {
      const staff = await this.prisma.user.findUnique({
        where: { promoCode: dto.staffPromoCode },
      });

      if (staff && staff.role === 'STAFF') {
        discountInfo = { staffName: staff.fullName, discountRate: 15 };
      }
    }

    await this.prisma.lead.upsert({
      where: { phone: dto.phone },
      update: {
        financialProfile: profile as any,
        answers: dto.answers as any,
        staffPromoCode: dto.staffPromoCode,
      },
      create: {
        phone: dto.phone,
        financialProfile: profile as any,
        answers: dto.answers as any,
        staffPromoCode: dto.staffPromoCode,
      },
    });

    const message = discountInfo
      ? `${profileLabel} seviyesindesiniz. Size en uygun eğitim: "${recommendedProgram}". ${discountInfo.staffName} referansıyla %${discountInfo.discountRate} indirimli alabilirsiniz. ORCA'nın yapay zeka destekli kişiselleştirilmiş eğitim planı, performans takibi ve tamamlama sertifikasıyla yatırım yolculuğunuza güvenle başlayın.`
      : `${profileLabel} seviyesindesiniz. Size en uygun eğitim: "${recommendedProgram}". ORCA'nın yapay zeka destekli kişiselleştirilmiş eğitim planı, performans takibi ve tamamlama sertifikasıyla yatırım yolculuğunuza güvenle başlayın.`;

    return {
      financialProfile: profile,
      profileLabel,
      recommendedProgram,
      discountInfo,
      message,
    };
  }

  async lookupByPhone(phone: string) {
    const lead = await this.prisma.lead.findUnique({ where: { phone } });

    if (!lead) {
      return { found: false };
    }

    const profileLabel = PROFILE_LABEL[lead.financialProfile];
    const recommendedProgram = PROGRAM_BY_PROFILE[lead.financialProfile];

    return {
      found: true,
      financialProfile: lead.financialProfile,
      profileLabel,
      recommendedProgram,
      converted: !!lead.convertedUserId,
    };
  }
}
