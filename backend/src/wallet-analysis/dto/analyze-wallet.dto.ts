import { IsEthereumAddress } from 'class-validator';

export class AnalyzeWalletDto {
  @IsEthereumAddress()
  address!: string;
}
