import { IsEnum } from 'class-validator';
import { EstadoReto } from '../../retos/entities/reto.entity';

export class DecisionRetoDto {
  @IsEnum(EstadoReto)
  estadoReto: EstadoReto;
}
