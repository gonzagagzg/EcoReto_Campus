import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoPremio } from '../entities/premio.entity';

export class ActualizarPremioDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombrePremio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcionPremio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  puntosPremio?: number;

  /** Baja y restauración del catálogo: sólo Administrador puede enviarlo. */
  @IsOptional()
  @IsEnum(EstadoPremio)
  estado?: EstadoPremio;

  @IsOptional()
  @IsString()
  imagenPremio?: string;
}
