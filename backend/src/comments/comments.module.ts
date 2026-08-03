import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SuspensionsModule } from '../suspensions/suspensions.module';

@Module({
  imports: [NotificationsModule, SuspensionsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
