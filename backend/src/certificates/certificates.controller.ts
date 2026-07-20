import { Controller, Get, Post, Body, Param, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  issue(@Req() req: Request, @Body() dto: CreateCertificateDto) {
    const userId = (req.user as any).id;
    return this.certificatesService.issue(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.certificatesService.findAll();
  }

  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificatesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/pdf')
  async downloadPdf(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const userId = (req.user as any).id;
    const pdfBuffer = await this.certificatesService.generatePdf(id, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="orca-sertifika.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
