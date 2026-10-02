import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Dificultad, EstadoReto } from '../entities/reto.entity';

/**
 * Convierte query params de texto a booleano sin el error de `@Type(() => Boolean)`,
 * que interpreta cualquier cadena no vacia (incluido "false") como `true`.
 */
const aBooleano = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizado = value.trim().toLowerCase();

    if (['true', '1', 'si', 'yes'].includes(normalizado)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalizado)) {
      return false;
    }

    return undefined;
  }

  return value;
};

export class RetoQueryDto {
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
  @IsEnum(EstadoReto)
  estadoReto?: EstadoReto;

  @IsOptional()
  @IsIn(Object.values(Dificultad))
  dificultad?: Dificultad;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuarioCreador?: number;

  @IsOptional()
  @IsString()
  busqueda?: string;

  /** Solo para Supervisor/Administrador: mostrar tambien pendientes y bloqueados. */
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  todosEstados?: boolean;

  /** Por defecto el feed oculta los retos cuya fecha limite ya paso. */
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  incluirVencidos?: boolean;
}
