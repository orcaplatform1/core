import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('upload-url')
  getUploadUrl(
    @Body('fileName') fileName: string,
    @Body('contentType') contentType: string,
    @Body('folder') folder: 'videos' | 'pdfs' | 'resources',
  ) {
    return this.storageService.getUploadUrl(fileName, contentType, folder);
  }

  @UseGuards(JwtAuthGuard)
  @Get('play/:key')
  getPlayUrl(@Param('key') key: string) {
    return this.storageService.getPlayUrl(decodeURIComponent(key));
  }
}
