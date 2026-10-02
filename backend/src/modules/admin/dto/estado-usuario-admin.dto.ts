import { IsEnum } from 'class-validator';
import { EstadoUsuario } from '../../usuarios/entities/usuario.entity';

export class EstadoUsuarioAdminDto {
  @IsEnum(EstadoUsuario)
  estado: EstadoUsuario;
}
