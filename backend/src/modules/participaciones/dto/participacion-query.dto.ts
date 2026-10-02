import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EstadoEvaluacion } from '../entities/participacion.entity';

export class ParticipacionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;

  @IsOptional()
  @IsEnum(EstadoEvaluacion)
  estadoParticipacion?: EstadoEvaluacion;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRetosParticipantes?: number;
}
