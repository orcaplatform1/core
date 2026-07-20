import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { QuizAttemptsService } from './quiz-attempts.service';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import { FinishQuizAttemptDto } from './dto/finish-quiz-attempt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('quiz-attempts')
export class QuizAttemptsController {
  constructor(private readonly quizAttemptsService: QuizAttemptsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  start(@Req() req: Request, @Body() dto: CreateQuizAttemptDto) {
    const userId = (req.user as any).id;
    return this.quizAttemptsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('finish')
  finish(@Body() dto: FinishQuizAttemptDto) {
    return this.quizAttemptsService.finish(dto.attemptId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.quizAttemptsService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizAttemptsService.findOne(id);
  }
}
