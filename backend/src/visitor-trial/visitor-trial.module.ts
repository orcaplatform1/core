import { Module } from '@nestjs/common';
import { VisitorTrialController } from './visitor-trial.controller';
import { VisitorTrialService } from './visitor-trial.service';

@Module({
  controllers: [VisitorTrialController],
  providers: [VisitorTrialService],
})
export class VisitorTrialModule {}
