import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from './auth-cookies.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('health')
  health() {
    return this.authService.health();
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, refreshToken, user } = await this.authService.register(dto);
    setAuthCookies(res, token, refreshToken);
    return { user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const { token, refreshToken, user } = await this.authService.login(dto, ip, userAgent);
    setAuthCookies(res, token, refreshToken);
    return { user };
  }

  // JwtAuthGuard kasitli olarak kullanilmiyor: bu uc tam olarak access token'in
  // suresi dolduktan sonra cagrilir, guard o an zaten 401 doner ve refresh'e
  // hic sira gelmezdi (bkz. auth.service.ts refresh() yorumu).
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const accessCookie = req.cookies?.[ACCESS_COOKIE];
    const refreshCookie = req.cookies?.[REFRESH_COOKIE];
    if (!accessCookie || !refreshCookie) {
      throw new UnauthorizedException('Oturum bulunamadı, lütfen tekrar giriş yapın.');
    }

    let payload: { sub: string; sessionId?: string };
    try {
      payload = this.jwtService.verify(accessCookie, { ignoreExpiration: true });
    } catch {
      throw new UnauthorizedException('Geçersiz oturum.');
    }

    const { token, refreshToken, user } = await this.authService.refresh(payload, refreshCookie);
    setAuthCookies(res, token, refreshToken);
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req.user as any).id;
    const result = await this.authService.logout(userId);
    clearAuthCookies(res);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  getDevices(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authService.getMyDevices(userId);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as any).id;
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone-verification/request')
  requestPhoneVerification(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authService.requestPhoneVerification(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone-verification/confirm')
  confirmPhoneVerification(@Req() req: Request, @Body() dto: ConfirmPhoneVerificationDto) {
    const userId = (req.user as any).id;
    return this.authService.confirmPhoneVerification(userId, dto.code);
  }

  @Post('google')
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }

  @Post('apple')
  appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLogin(dto.idToken, dto.fullName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  completeProfile(
    @Req() req: Request,
    @Body() dto: CompleteProfileDto,
  ) {
    const userId = (req.user as any).id;
    return this.authService.completeProfile(userId, dto.username, dto.phone, dto.gender);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admin')
  admin() {
    return {
      success: true,
      message: 'SUPER_ADMIN erişimi başarılı.',
    };
  }
}
