import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarRetoDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombreReto?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descripcionReto?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  categoria?: string;

  /** Si cambia, se recalculan dificultad y puntos con las reglas de duracion. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fechaLimite?: Date;
}
