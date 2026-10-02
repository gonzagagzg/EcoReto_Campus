import { IsString, MaxLength, MinLength } from 'class-validator';

export class CrearSoporteDto {
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  nombreSoporte: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  detalleSoporte: string;
}
