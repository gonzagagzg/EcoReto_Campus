import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, In, type Repository } from 'typeorm';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Soporte } from '../entities/soporte.entity';

export interface FiltrosSoporte {
  estadoSoporte?: EstadoEvaluacion;
  idUsuario?: number;
  skip?: number;
  take?: number;
}

/** Ticket listado junto al nombre de quien lo abrió (nunca exponer el usuario entero). */
export type TicketSoporte = Soporte & { nombreUsuario: string };

@Injectable()
export class SoporteDao {
  constructor(
    @InjectRepository(Soporte) private readonly soporteRepo: Repository<Soporte>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
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

  async listar(filtros: FiltrosSoporte): Promise<{ items: TicketSoporte[]; total: number }> {
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

    return { items: await this.conNombreDeUsuario(items), total };
  }

  /** Agrega el nombre de quien abrió el ticket sin exponer la fila completa del usuario. */
  private async conNombreDeUsuario(items: Soporte[]): Promise<TicketSoporte[]> {
    if (items.length === 0) {
      return [];
    }

    const ids = [...new Set(items.map((ticket) => ticket.idUsuario))];
    const usuarios = await this.usuarioRepo.find({
      where: { idUsuario: In(ids) },
      select: { idUsuario: true, nombre: true, apellido: true },
    });
    const nombres = new Map(
      usuarios.map((usuario) => [
        usuario.idUsuario,
        `${usuario.nombre} ${usuario.apellido}`.trim(),
      ]),
    );

    return items.map((ticket) =>
      Object.assign(ticket, {
        nombreUsuario: nombres.get(ticket.idUsuario) ?? `Usuario #${ticket.idUsuario}`,
      }),
    );
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
