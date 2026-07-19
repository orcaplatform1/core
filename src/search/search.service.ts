import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    if (!query || query.trim().length < 2) {
      return { programs: [], modules: [], lessons: [], quizzes: [] };
    }

    const q = query.trim();

    const [programs, modules, lessons, quizzes] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT id, title, description, similarity(title, ${q}) as score
        FROM "Program"
        WHERE title ILIKE ${'%' + q + '%'} OR similarity(title, ${q}) > 0.2
        ORDER BY score DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw`
        SELECT id, title, "programId", similarity(title, ${q}) as score
        FROM "Module"
        WHERE title ILIKE ${'%' + q + '%'} OR similarity(title, ${q}) > 0.2
        ORDER BY score DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw`
        SELECT id, title, "moduleId", similarity(title, ${q}) as score
        FROM "Lesson"
        WHERE title ILIKE ${'%' + q + '%'} OR similarity(title, ${q}) > 0.2
        ORDER BY score DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw`
        SELECT id, title, "lessonId", similarity(title, ${q}) as score
        FROM "Quiz"
        WHERE title ILIKE ${'%' + q + '%'} OR similarity(title, ${q}) > 0.2
        ORDER BY score DESC
        LIMIT 10
      `,
    ]);

    return { programs, modules, lessons, quizzes };
  }
}
