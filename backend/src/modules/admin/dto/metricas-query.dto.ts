import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class MetricasQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  desde?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hasta?: Date;
}
