import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CanjearPremioDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idPremio: number;
}
