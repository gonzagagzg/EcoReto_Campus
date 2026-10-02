import { Type } from 'class-transformer';
import { IsDate, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearRetoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombreReto!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descripcionReto!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  categoria!: string;

  /** Define la dificultad y los puntos: el cliente no envia dificultad ni puntaje. */
  @Type(() => Date)
  @IsDate()
  fechaLimite!: Date;
}
