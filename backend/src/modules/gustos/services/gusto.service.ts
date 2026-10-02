import { Injectable } from '@nestjs/common';
import { GustoDao } from '../daos/gusto.dao';
import { CrearGustoDto } from '../dto/crear-gusto.dto';
import { ActualizarGustoDto } from '../dto/actualizar-gusto.dto';
import { EstadoGusto, Gusto } from '../entities/gusto.entity';

@Injectable()
export class GustoService {
  constructor(private readonly gustoDao: GustoDao) {}

  async listar(estado?: string): Promise<Gusto[]> {
    return this.gustoDao.listar(estado);
  }

  async buscar(id: number): Promise<Gusto | null> {
    return this.gustoDao.buscarPorId(id);
  }

  async crear(dto: CrearGustoDto): Promise<Gusto> {
    return this.gustoDao.crear({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      estado: dto.estado === 'desactivo' ? EstadoGusto.Desactivo : EstadoGusto.Activo,
    });
  }

  async actualizar(id: number, dto: ActualizarGustoDto): Promise<Gusto | null> {
    const estado = dto.estado === 'desactivo'
      ? EstadoGusto.Desactivo
      : dto.estado === 'activo'
        ? EstadoGusto.Activo
        : undefined;

    return this.gustoDao.actualizar(id, {
      nombre: dto.nombre ?? undefined,
      descripcion: dto.descripcion ?? undefined,
      estado,
    });
  }

  async eliminar(id: number): Promise<boolean> {
    return this.gustoDao.eliminar(id);
  }
}