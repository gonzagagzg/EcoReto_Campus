import { IsString, MaxLength, MinLength } from 'class-validator';

/** Cuerpo para vaciar la tabla logs: exige la contrasena del admin. */
export class VaciarLogsDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;
}
