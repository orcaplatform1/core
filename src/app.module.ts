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
import { CertificatesModule } from './certificates/certificates.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { PaymentsModule } from './payments/payments.module';
import { CategoriesModule } from './categories/categories.module';
import { StreakModule } from './streak/streak.module';
import { BadgesModule } from './badges/badges.module';
import { MentorModule } from './mentor/mentor.module';
import { SimulationModule } from './simulation/simulation.module';
import { BacktestModule } from './backtest/backtest.module';
import { LiveLessonsModule } from './live-lessons/live-lessons.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    CertificatesModule,
    SubscriptionsModule,
    EnrollmentsModule,
    PaymentsModule,
    CategoriesModule,
    StreakModule,
    BadgesModule,
    MentorModule,
    SimulationModule,
    BacktestModule,
    LiveLessonsModule,
  ],
})
export class AppModule {}
