import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { QuizAnswersService } from './quiz-answers.service';
import { CreateQuizAnswerDto } from './dto/create-quiz-answer.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('quiz-answers')
export class QuizAnswersController {
  constructor(private readonly quizAnswersService: QuizAnswersService) {}

  // Guvenlik: bu iki uc herkese acikti ve isCorrect alaniyla birlikte TUM
  // kullanicilarin sectigi cevabi donduruyordu - dolayisiyla giris yapmadan
  // bile her sorunun dogru sikkini (selectedAnswerId + isCorrect eslesmesinden)
  // cikarmak mumkundu. questions/answers modulundeki ayni riskli alanlarla
  // tutarli olacak sekilde SUPER_ADMIN'e kisitlandi (frontend zaten sadece
  // POST /quiz-answers kullaniyor, bkz. use-quiz.ts).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll() {
    return this.quizAnswersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizAnswersService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request, @Body() dto: CreateQuizAnswerDto) {
    const userId = (req.user as any).id;
    return this.quizAnswersService.create(userId, dto);
  }
}
