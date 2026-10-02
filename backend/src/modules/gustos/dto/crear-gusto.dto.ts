import { IsString, IsOptional, Length } from 'class-validator';

export class CrearGustoDto {
  @IsString()
  @Length(3, 100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  estado?: string;
}