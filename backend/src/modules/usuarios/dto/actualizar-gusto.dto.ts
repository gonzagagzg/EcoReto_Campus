import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoGusto } from '../entities/gusto.entity';

export class ActualizarGustoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombreGusto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenGusto?: string;

  @IsOptional()
  @IsEnum(EstadoGusto)
  estado?: EstadoGusto;
}