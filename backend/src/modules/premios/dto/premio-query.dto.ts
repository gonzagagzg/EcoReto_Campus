import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PremioQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  puntosMaximos?: number;
}
