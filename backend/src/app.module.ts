import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProgramsModule } from './programs/programs.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { LessonTasksModule } from './lesson-tasks/lesson-tasks.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { QuestionsModule } from './questions/questions.module';
import { AnswersModule } from './answers/answers.module';
import { QuizAttemptsModule } from './quiz-attempts/quiz-attempts.module';
import { QuizAnswersModule } from './quiz-answers/quiz-answers.module';
import { ProgressModule } from './progress/progress.module';
import { CertificatesModule } from './certificates/certificates.module';
import { SuccessStoriesModule } from './success-stories/success-stories.module';
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
import { ManageModule } from './manage/manage.module';
import { StatsModule } from './stats/stats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { FinancialTestModule } from './financial-test/financial-test.module';
import { ScannerModule } from './scanner/scanner.module';
import { StorageModule } from './storage/storage.module';
import { QuotesModule } from './quotes/quotes.module';
import { ChartDrawingsModule } from './chart-drawings/chart-drawings.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PagesModule } from './pages/pages.module';
import { WhaleTrackerModule } from './whale-tracker/whale-tracker.module';
import { FooterModule } from './footer/footer.module';
import { SiteContentModule } from './site-content/site-content.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { SecurityLogModule } from './security-log/security-log.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CacheModule } from './cache/cache.module';
import { PublicToolsModule } from './public-tools/public-tools.module';
import { TokenUnlockModule } from './token-unlock/token-unlock.module';
import { IcoTrackerModule } from './ico-tracker/ico-tracker.module';
import { CryptoCalendarModule } from './crypto-calendar/crypto-calendar.module';
import { NewsSentimentModule } from './news-sentiment/news-sentiment.module';
import { PointsModule } from './points/points.module';
import { RetentionModule } from './retention/retention.module';
import { CommentsModule } from './comments/comments.module';
import { DmModule } from './dm/dm.module';
import { SuspensionsModule } from './suspensions/suspensions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupportModule } from './support/support.module';
import { CommunityModule } from './community/community.module';
import { AirdropModule } from './airdrop/airdrop.module';
import { VisitorTrialModule } from './visitor-trial/visitor-trial.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    ProgramsModule,
    ModulesModule,
    LessonsModule,
    LessonTasksModule,
    QuizzesModule,
    QuestionsModule,
    AnswersModule,
    QuizAttemptsModule,
    QuizAnswersModule,
    ProgressModule,
    CertificatesModule,
    SuccessStoriesModule,
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
    ManageModule,
    StatsModule,
    NotificationsModule,
    SearchModule,
    FinancialTestModule,
    ScannerModule,
    StorageModule,
    QuotesModule,
    ChartDrawingsModule,
    AuditLogModule,
    PagesModule,
    FooterModule,
    SiteContentModule,
    SitemapModule,
    SecurityLogModule,
    InvoicesModule,
    PublicToolsModule,
    WhaleTrackerModule,
    TokenUnlockModule,
    IcoTrackerModule,
    CryptoCalendarModule,
    NewsSentimentModule,
    PointsModule,
    RetentionModule,
    CommentsModule,
    DmModule,
    SuspensionsModule,
    AnalyticsModule,
    SupportModule,
    CommunityModule,
    AirdropModule,
    VisitorTrialModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
