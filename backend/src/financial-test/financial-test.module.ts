import { Module } from '@nestjs/common';
import { FinancialTestService } from './financial-test.service';
import { FinancialTestController } from './financial-test.controller';

@Module({
  controllers: [FinancialTestController],
  providers: [FinancialTestService],
})
export class FinancialTestModule {}
