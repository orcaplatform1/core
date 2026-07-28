import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  findAll() {
    return this.pagesService.findAll();
  }

  @Get('footer')
  findFooterPages() {
    return this.pagesService.findFooterPages();
  }

  // NOTE on visibility gating approach:
  // This endpoint stays fully public/unauthenticated (no @UseGuards) so that anonymous
  // visitors can still load genuinely public pages. To ALSO honor `Page.visibility` for
  // role-gated pages, we opportunistically try to identify the requester here: if a
  // `Bearer` token is present we verify it (same secret as AuthModule, see
  // pages.module.ts) and read the `role` claim directly out of the JWT payload — the
  // token payload created at login (see auth.service.ts issueTokens: `{ sub, email,
  // role, sessionId }`) already carries the user's role, so no extra DB lookup is
  // needed. If there's no token, the token is invalid/expired, or anything else goes
  // wrong while decoding, we simply fall back to `requesterRole = undefined` (treated
  // as anonymous) instead of throwing — only pagesService.findBySlug's own visibility
  // check should ever produce a 403. This keeps the endpoint simple and avoids a DB hit
  // on every public page view, while still giving real server-side enforcement for
  // role-gated pages (not just a client-side gate).
  @Get(':slug')
  async findBySlug(@Req() req: Request, @Param('slug') slug: string) {
    const requesterRole = await this.tryGetRoleFromRequest(req);
    return this.pagesService.findBySlug(slug, requesterRole);
  }

  private async tryGetRoleFromRequest(req: Request): Promise<string | undefined> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return undefined;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      return typeof payload?.role === 'string' ? payload.role : undefined;
    } catch {
      // Invalid, malformed, or expired token — treat as anonymous rather than throwing.
      return undefined;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Req() req: Request, @Body() dto: CreatePageDto) {
    const actorId = (req.user as any).id;
    return this.pagesService.create(dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePageDto) {
    const actorId = (req.user as any).id;
    return this.pagesService.update(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.pagesService.remove(id, actorId);
  }
}
