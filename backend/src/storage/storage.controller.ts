import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('upload-url')
  getUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.storageService.getUploadUrl(dto.fileName, dto.contentType, dto.folder, dto.fileSizeBytes);
  }

  @UseGuards(JwtAuthGuard)
  @Get('play/:key')
  getPlayUrl(@Param('key') key: string) {
    return this.storageService.getPlayUrl(decodeURIComponent(key));
  }
}
