import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { COMMUNITY_ICT_TAGS, COMMUNITY_TIMEFRAMES } from '../community.constants';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  symbol!: string;

  @IsIn(COMMUNITY_TIMEFRAMES)
  timeframe!: (typeof COMMUNITY_TIMEFRAMES)[number];

  @IsIn(['LONG', 'SHORT', 'NEUTRAL'])
  direction!: 'LONG' | 'SHORT' | 'NEUTRAL';

  @IsArray()
  @IsIn(COMMUNITY_ICT_TAGS, { each: true })
  ictTags!: (typeof COMMUNITY_ICT_TAGS)[number][];

  @IsBoolean()
  disclaimerAccepted!: boolean;
}
