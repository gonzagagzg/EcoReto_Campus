import { IsEnum } from 'class-validator';
import { EstadoUsuario } from '../entities/usuario.entity';

export class CambiarEstadoUsuarioDto {
  @IsEnum(EstadoUsuario)
  estado: EstadoUsuario;
}
