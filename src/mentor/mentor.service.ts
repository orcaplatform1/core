import { Injectable, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MentorService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureAccess(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });

    if (enrollmentCount === 0) {
      throw new ForbiddenException('Yapay Zeka Mentoru sadece sahip olduğunuz programlarda kullanılabilir.');
    }
  }

  private async buildUserContext(userId: string) {
    const progress = await this.prisma.progress.findMany({ where: { userId } });
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0;

    return {
      completedLessons: progress.filter((p) => p.completed).length,
      totalTracked: progress.length,
      recentQuizAvg: avgScore,
      recentAttempts: attempts.map((a) => ({
        quizId: a.quizId,
        percentage: a.percentage,
        passed: a.passed,
      })),
    };
  }

  async sendMessage(userId: string, dto: CreateMessageDto) {
    await this.ensureAccess(userId);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    const conversation = await this.prisma.conversation.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.content,
      },
    });

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Yapay Zeka Mentoru henüz yapılandırılmadı (ANTHROPIC_API_KEY eksik).',
      );
    }

    const context = await this.buildUserContext(userId);

    const systemPrompt = `Sen ORCA platformunun Yapay Zeka Mentorusun. Sadece kullanıcının ORCA'daki eğitim verilerine göre konuş, internetten genel bilgi uydurma. Kullanıcı verisi: ${JSON.stringify(context)}`;

    // Anthropic API çağrısı buraya gelecek (API key eklendiğinde aktif olacak):
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': apiKey,
    //     'anthropic-version': '2023-06-01',
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-sonnet-4-6',
    //     max_tokens: 1024,
    //     system: systemPrompt,
    //     messages: [{ role: 'user', content: dto.content }],
    //   }),
    // });
    // const data = await response.json();
    // const reply = data.content[0].text;

    const reply = 'AI Mentor API bağlantısı henüz aktif değil.';

    const saved = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'MENTOR',
        content: reply,
      },
    });

    return saved;
  }

  async getHistory(userId: string) {
    await this.ensureAccess(userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return conversation?.messages ?? [];
  }
}
