import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  alias?: string;

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
  @IsString()
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena?: string;
}
