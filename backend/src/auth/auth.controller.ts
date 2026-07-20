import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() {
    return this.authService.health();
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(dto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  refresh(@Req() req: Request, @Body() dto: RefreshTokenDto) {
    const userId = (req.user as any).id;
    return this.authService.refresh(userId, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authService.logout(userId);
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
