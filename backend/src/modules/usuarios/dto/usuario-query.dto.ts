import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EstadoUsuario, Rol } from '../entities/usuario.entity';

export class UsuarioQueryDto {
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
  @IsEnum(EstadoUsuario)
  estado?: EstadoUsuario;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @IsString()
  busqueda?: string;
}
