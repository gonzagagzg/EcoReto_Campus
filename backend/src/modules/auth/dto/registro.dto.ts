import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(100)
  apellido: string;

  @IsEmail()
  @MaxLength(150)
  correo: string;

  @IsString()
  @MaxLength(50)
  alias: string;

  @IsString()
  @MaxLength(20)
  cedula: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrera?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nivelCarrera?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  centroEstudios?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : value,
  )
  idsGustos?: number[];
}
