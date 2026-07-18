import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';

@Controller('quiz-attempts')
export class QuizAttemptsController {
  constructor(
    private readonly quizAttemptsService: QuizAttemptsService,
  ) {}

  @Post()
  create(@Body() createQuizAttemptDto: CreateQuizAttemptDto) {
    return this.quizAttemptsService.create('', createQuizAttemptDto);
  }

  @Get()
  findAll() {
    return this.quizAttemptsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizAttemptsService.findOne(id);
  }
}
