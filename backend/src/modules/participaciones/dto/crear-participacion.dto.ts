import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearParticipacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idReto: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}
