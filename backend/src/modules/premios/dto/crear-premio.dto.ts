import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearPremioDto {
  @IsString()
  @MaxLength(150)
  nombrePremio: string;

  @IsString()
  @MaxLength(2000)
  descripcionPremio: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  puntosPremio: number;

  @IsOptional()
  @IsString()
  imagenPremio?: string;
}
