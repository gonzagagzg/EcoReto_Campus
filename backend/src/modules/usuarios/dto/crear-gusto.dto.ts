import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearGustoDto {
  @IsString()
  @MaxLength(100)
  nombreGusto: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenGusto?: string;
}