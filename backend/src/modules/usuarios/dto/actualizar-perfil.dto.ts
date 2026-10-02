import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Edicion directa del perfil propio. Nombre, apellido, cedula y correo no se pueden cambiar
 * desde aqui: esos datos se actualizan unicamente por un ticket de soporte resuelto por el
 * Administrador.
 */
export class ActualizarPerfilDto {
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
  @MinLength(8)
  @MaxLength(72)
  contrasena?: string;
}
