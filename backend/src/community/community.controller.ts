import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostUploadUrlDto } from './dto/get-post-upload-url.dto';
import { ReactPostDto } from './dto/react-post.dto';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { ReportPostDto } from './dto/report-post.dto';

@Controller()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('community/posts')
  listFeed(
    @Req() req: Request,
    @Query('sort') sort?: string,
    @Query('symbol') symbol?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req.user as any)?.id;
    return this.communityService.listFeed(userId, {
      sort,
      symbol,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('community/posts/:id')
  getOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.id;
    return this.communityService.getOne(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts/upload-url')
  getUploadUrl(@Req() req: Request, @Body() dto: GetPostUploadUrlDto) {
    const userId = (req.user as any).id;
    return this.communityService.getUploadUrl(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts')
  create(@Req() req: Request, @Body() dto: CreatePostDto) {
    const userId = (req.user as any).id;
    return this.communityService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts/:id/react')
  react(@Param('id') id: string, @Req() req: Request, @Body() dto: ReactPostDto) {
    const userId = (req.user as any).id;
    return this.communityService.react(id, userId, dto.type);
  }

  @Get('community/posts/:id/comments')
  listComments(@Param('id') id: string, @Query('page') page?: string) {
    return this.communityService.listComments(id, page ? parseInt(page, 10) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts/:id/comments')
  addComment(@Param('id') id: string, @Req() req: Request, @Body() dto: CreatePostCommentDto) {
    const userId = (req.user as any).id;
    return this.communityService.addComment(id, userId, dto.text);
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts/:id/report')
  report(@Param('id') id: string, @Req() req: Request, @Body() dto: ReportPostDto) {
    const userId = (req.user as any).id;
    return this.communityService.report(id, userId, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/community/hidden')
  listHidden() {
    return this.communityService.listHidden();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/community/active')
  listActive(@Query('page') page?: string) {
    return this.communityService.listActive(page ? parseInt(page, 10) : 1);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/community/:id/pin')
  setPinned(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.communityService.setPinned(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/community/:id/unpin')
  unpin(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.communityService.unpin(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/community/:id/restore')
  restore(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.communityService.restore(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Delete('manage/community/:id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.communityService.removePermanently(id, userId);
  }
}
