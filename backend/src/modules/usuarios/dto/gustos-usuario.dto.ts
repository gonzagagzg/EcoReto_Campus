import { IsArray, IsInt, Min } from 'class-validator';

export class GustosUsuarioDto {
  /** Se permite vacio para borrar todos los gustos del estudiante. */
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  idsGustos: number[];
}
