import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AirdropService } from './airdrop.service';
import { QueryAirdropDto } from './dto/query-airdrop.dto';

// Herkese acik (login sarti yok) - Araclar > Airdrop Center bolumu, tarayici
// yatirimcilarin giris yapmadan da goz atabilmesi hedefleniyor.
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('airdrops')
export class AirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  // NOT: sabit path'li route'lar (featured/upcoming/active/search/filter)
  // ':slug' route'undan ONCE tanimlanmali, aksi halde Nest 'featured' gibi
  // degerleri slug parametresi olarak yakalar.
  @Get('featured')
  findFeatured(@Query() query: QueryAirdropDto) {
    return this.airdropService.findFeatured(query);
  }

  @Get('upcoming')
  findUpcoming(@Query() query: QueryAirdropDto) {
    return this.airdropService.findUpcoming(query);
  }

  @Get('active')
  findActive(@Query() query: QueryAirdropDto) {
    return this.airdropService.findActive(query);
  }

  @Get('search')
  search(@Query() query: QueryAirdropDto) {
    return this.airdropService.search(query);
  }

  @Get('filter')
  filter(@Query() query: QueryAirdropDto) {
    return this.airdropService.filter(query);
  }

  @Get()
  findAll(@Query() query: QueryAirdropDto) {
    return this.airdropService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.airdropService.findBySlug(slug);
  }
}
