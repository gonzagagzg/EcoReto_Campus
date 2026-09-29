import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, type Repository } from 'typeorm';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';
import { Soporte } from '../entities/soporte.entity';

export interface FiltrosSoporte {
  estadoSoporte?: EstadoEvaluacion;
  idUsuario?: number;
  skip?: number;
  take?: number;
}

@Injectable()
export class SoporteDao {
  constructor(
    @InjectRepository(Soporte) private readonly soporteRepo: Repository<Soporte>,
  ) {}

  async crear(datos: DeepPartial<Soporte>): Promise<Soporte> {
    const ticket = this.soporteRepo.create(datos);
    return this.soporteRepo.save(ticket);
  }

  buscarPorId(idSoporte: number): Promise<Soporte | null> {
    return this.soporteRepo.findOne({ where: { idSoporte } });
  }

  async actualizar(idSoporte: number, datos: DeepPartial<Soporte>): Promise<Soporte> {
    await this.soporteRepo.update(idSoporte, datos);

    const ticket = await this.buscarPorId(idSoporte);

    if (!ticket) {
      throw new NotFoundException(`Ticket de soporte ${idSoporte} no encontrado`);
    }

    return ticket;
  }

  async listar(filtros: FiltrosSoporte): Promise<{ items: Soporte[]; total: number }> {
    const query = this.soporteRepo.createQueryBuilder('soporte');

    if (filtros.estadoSoporte) {
      query.andWhere('soporte.estado_soporte = :estado', { estado: filtros.estadoSoporte });
    }

    if (filtros.idUsuario) {
      query.andWhere('soporte.id_usuario = :idUsuario', { idUsuario: filtros.idUsuario });
    }

    query
      .orderBy('soporte.id_soporte', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async atender(
    idSoporte: number,
    estadoSoporte: EstadoEvaluacion,
  ): Promise<Soporte> {
    await this.soporteRepo.update(idSoporte, {
      estadoSoporte,
      fechaAtencion: estadoSoporte === EstadoEvaluacion.Enviado ? null : new Date(),
    });

    const ticket = await this.buscarPorId(idSoporte);

    if (!ticket) {
      throw new NotFoundException(`Ticket de soporte ${idSoporte} no encontrado`);
    }

    return ticket;
  }

  async contarPorEstado(): Promise<{ estado: EstadoEvaluacion; total: number }[]> {
    const filas = await this.soporteRepo
      .createQueryBuilder('soporte')
      .select('soporte.estado_soporte', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('soporte.estado_soporte')
      .getRawMany<{ estado: EstadoEvaluacion; total: string }>();

    return filas.map((fila) => ({ estado: fila.estado, total: Number(fila.total) }));
  }
}
