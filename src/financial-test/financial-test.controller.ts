import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { FinancialTestService } from './financial-test.service';
import { SubmitTestDto } from './dto/submit-test.dto';

@Controller('financial-test')
export class FinancialTestController {
  constructor(private readonly financialTestService: FinancialTestService) {}

  @Post('submit')
  submit(@Body() dto: SubmitTestDto) {
    return this.financialTestService.submit(dto);
  }

  @Get('lookup/:phone')
  lookup(@Param('phone') phone: string) {
    return this.financialTestService.lookupByPhone(phone);
  }
}
