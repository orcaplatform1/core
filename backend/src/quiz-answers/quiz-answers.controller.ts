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

@Controller('quiz-answers')
export class QuizAnswersController {
  constructor(private readonly quizAnswersService: QuizAnswersService) {}

  @Get()
  findAll() {
    return this.quizAnswersService.findAll();
  }

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
