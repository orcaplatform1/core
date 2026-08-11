import { Module } from '@nestjs/common';
import { SponsorshipsController } from './sponsorships.controller';
import { AdminSponsorshipsController } from './admin-sponsorships.controller';
import { SponsorshipsService } from './sponsorships.service';
import { PaymentsModule } from '../payments/payments.module';
import { IcoTrackerModule } from '../ico-tracker/ico-tracker.module';
import { AirdropModule } from '../airdrop/airdrop.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PaymentsModule, IcoTrackerModule, AirdropModule, NotificationsModule],
  controllers: [SponsorshipsController, AdminSponsorshipsController],
  providers: [SponsorshipsService],
})
export class SponsorshipsModule {}
