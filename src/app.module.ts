import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProgramsModule } from './programs/programs.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { QuestionsModule } from './questions/questions.module';
import { AnswersModule } from './answers/answers.module';
import { QuizAttemptsModule } from './quiz-attempts/quiz-attempts.module';
import { QuizAnswersModule } from './quiz-answers/quiz-answers.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProgramsModule,
    ModulesModule,
    LessonsModule,
    QuizzesModule,
    QuestionsModule,
    AnswersModule,
    QuizAttemptsModule,
    QuizAnswersModule,
    ProgressModule,
  ],
})
export class AppModule {}
