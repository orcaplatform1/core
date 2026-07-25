import { IsInt, Min } from 'class-validator';
export class BanUserDto {
  @IsInt()
  @Min(1)
  days!: number;
}
