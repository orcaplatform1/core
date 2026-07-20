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
  refresh(@Req() req: Request, @Body('refreshToken') refreshToken: string) {
    const userId = (req.user as any).id;
    return this.authService.refresh(userId, refreshToken);
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
  requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('password-reset/confirm')
  resetPassword(@Body('token') token: string, @Body('newPassword') newPassword: string) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Post('verify-email')
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone-verification/request')
  requestPhoneVerification(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authService.requestPhoneVerification(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone-verification/confirm')
  confirmPhoneVerification(@Req() req: Request, @Body('code') code: string) {
    const userId = (req.user as any).id;
    return this.authService.confirmPhoneVerification(userId, code);
  }

  @Post('google')
  googleLogin(@Body('idToken') idToken: string) {
    return this.authService.googleLogin(idToken);
  }

  @Post('apple')
  appleLogin(@Body('idToken') idToken: string, @Body('fullName') fullName?: string) {
    return this.authService.appleLogin(idToken, fullName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  completeProfile(
    @Req() req: Request,
    @Body('username') username: string,
    @Body('phone') phone: string,
    @Body('gender') gender: string,
  ) {
    const userId = (req.user as any).id;
    return this.authService.completeProfile(userId, username, phone, gender);
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
