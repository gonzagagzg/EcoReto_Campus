import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';

/**
 * Respuesta del ticket. Ademas del estado, el Administrador puede aplicar en el perfil del
 * estudiante los datos sensibles que el usuario no puede editar por si mismo.
 */
export class ResponderSoporteDto {
  @IsEnum(EstadoEvaluacion)
  estadoSoporte: EstadoEvaluacion;

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
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  correo?: string;
}
