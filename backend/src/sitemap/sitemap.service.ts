import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BASE_URL = 'https://traders.tr';

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const [programs, pages] = await Promise.all([
      this.prisma.program.findMany({ select: { id: true, updatedAt: true } }),
      this.prisma.page.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const staticUrls = [
      { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${BASE_URL}/programs`, priority: '0.9', changefreq: 'daily' },
      { loc: `${BASE_URL}/login`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${BASE_URL}/register`, priority: '0.5', changefreq: 'monthly' },
    ];

    const programUrls = programs.map((p) => ({
      loc: `${BASE_URL}/programs/${p.id}`,
      lastmod: p.updatedAt.toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const pageUrls = pages.map((p) => ({
      loc: `${BASE_URL}/${p.slug}`,
      lastmod: p.updatedAt.toISOString().split('T')[0],
      priority: '0.3',
      changefreq: 'yearly',
    }));

    const allUrls = [...staticUrls, ...programUrls, ...pageUrls];

    const urlEntries = allUrls
      .map((u) => {
        const lastmod = 'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : '';
        return `  <url>\n    <loc>${u.loc}</loc>\n    ${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
  }
}
