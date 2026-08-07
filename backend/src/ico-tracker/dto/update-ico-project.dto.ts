import { PartialType } from '@nestjs/mapped-types';
import { CreateIcoProjectDto } from './create-ico-project.dto';

export class UpdateIcoProjectDto extends PartialType(CreateIcoProjectDto) {}
