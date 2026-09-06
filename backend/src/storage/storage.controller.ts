import { Controller, Post, Get, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';

const ADMIN_ONLY_FOLDERS = ['videos', 'pdfs', 'resources'];

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  getUploadUrl(@Req() req: Request, @Body() dto: GetUploadUrlDto) {
    const role = (req.user as any).role;
    if (ADMIN_ONLY_FOLDERS.includes(dto.folder) && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu klasöre yükleme yetkiniz yok.');
    }
    return this.storageService.getUploadUrl(dto.fileName, dto.contentType, dto.folder, dto.fileSizeBytes);
  }

  // Herhangi bir giris yapmis kullanici herhangi bir key icin presigned URL
  // isteyebiliyordu (IDOR) - "receipts/" klasoru baskasinin odeme dekonti gibi
  // hassas kisisel veriler icerdigi icin buradan tamamen cikarildi, sahiplik
  // kontrolu olan /payments/:id/receipt-url uzerinden cozulmesi zorunlu
  // (bkz. payments.service.ts getReceiptUrl). Diger klasorler (video/pdf/
  // resource) zaten sadece enrollment kontrolunden gecen ders ucundan
  // (lessons.service.ts) tahmin edilemez UUID'li key olarak donuyor.
  @UseGuards(JwtAuthGuard)
  @Get('play/:key')
  getPlayUrl(@Param('key') key: string) {
    const decoded = decodeURIComponent(key);
    if (decoded.startsWith('receipts/')) {
      throw new ForbiddenException('Bu dosya türü bu uçtan görüntülenemez.');
    }
    return this.storageService.getPlayUrl(decoded);
  }
}
