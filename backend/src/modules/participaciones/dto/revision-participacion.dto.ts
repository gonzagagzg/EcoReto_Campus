import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';

export class RevisionParticipacionDto {
  @IsEnum(EstadoEvaluacion)
  estadoParticipacion: EstadoEvaluacion;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacionRevision?: string;

  /** Dias cumplidos sobre los estimados. Define el pago proporcional: 100% / 50%. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasCumplidos?: number;
}
