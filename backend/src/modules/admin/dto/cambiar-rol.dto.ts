import { IsEnum } from 'class-validator';
import { Rol } from '../../usuarios/entities/usuario.entity';

export class CambiarRolDto {
  @IsEnum(Rol)
  rol: Rol;
}
