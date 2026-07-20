import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const xml = await this.sitemapService.generate();
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }
}
