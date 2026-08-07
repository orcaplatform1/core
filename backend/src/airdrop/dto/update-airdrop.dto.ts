import { PartialType } from '@nestjs/mapped-types';
import { CreateAirdropDto } from './create-airdrop.dto';

export class UpdateAirdropDto extends PartialType(CreateAirdropDto) {}
