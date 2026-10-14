import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoUsuario, Rol } from '../entities/usuario.entity';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  puntos?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  historialPuntos?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  retosCumplidos?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  nivel?: number;

  @IsOptional()
  @IsEnum(EstadoUsuario)
  estado?: EstadoUsuario;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
}
