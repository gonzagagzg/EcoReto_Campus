import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum EstadoCanjePremio {
  Pendiente = 'pendiente',
  ListoParaReclamar = 'listo para reclamar',
  Reclamado = 'reclamado',
  Negado = 'negado',
  Bloqueado = 'bloqueado',
}

export class EstadoCanjePremioDto {
  @IsNotEmpty()
  @IsEnum(EstadoCanjePremio)
  estadoCanjePremio!: EstadoCanjePremio;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacionCanje?: string;
}