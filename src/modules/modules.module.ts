import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModulesController],
  providers: [ModulesService],
  exports: [ModulesService],
})
export class ModulesModule {}
