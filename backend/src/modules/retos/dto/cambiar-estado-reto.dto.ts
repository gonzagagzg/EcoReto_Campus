import { IsEnum } from 'class-validator';
import { EstadoReto } from '../entities/reto.entity';

export class CambiarEstadoRetoDto {
  @IsEnum(EstadoReto)
  estadoReto: EstadoReto;
}
