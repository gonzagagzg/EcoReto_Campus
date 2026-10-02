import { BadRequestException, Injectable } from '@nestjs/common';
import { ParticipacionesService } from '../../participaciones/services/participaciones.service';
import type { ParticipacionConReto } from '../../participaciones/daos/participaciones.dao';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';
import { EstadoReto } from '../../retos/entities/reto.entity';
import { RetosService } from '../../retos/services/retos.service';
import { DecisionRetoDto } from '../dto/decision-reto.dto';
import { RevisionEvidenciaDto } from '../dto/revision-evidencia.dto';
import { SupervisionQueryDto } from '../dto/supervision-query.dto';
import type { ColaSupervision } from '../daos/supervisor.dao';
import { SupervisorDao } from '../daos/supervisor.dao';

export interface PanelSupervision extends ColaSupervision {
  ticketsSoportePendientes: number;
  retosPorEstado: Awaited<ReturnType<RetosService['contarPorEstado']>>;
  participacionesPorEstado: Awaited<ReturnType<ParticipacionesService['contarPorEstado']>>;
}

@Injectable()
export class SupervisorService {
  constructor(
    private readonly supervisorDao: SupervisorDao,
    private readonly retosService: RetosService,
    private readonly participacionesService: ParticipacionesService,
  ) {}

  async panel(): Promise<PanelSupervision> {
    const [colas, retosPorEstado, participacionesPorEstado] = await Promise.all([
      this.supervisorDao.contarColas(),
      this.retosService.contarPorEstado(),
      this.participacionesService.contarPorEstado(),
    ]);

    return { ...colas, retosPorEstado, participacionesPorEstado };
  }

  listarRetosPendientes(query: SupervisionQueryDto) {
    return this.supervisorDao.listarRetosPendientes(query.limite);
  }

  listarUsuariosPendientes(query: SupervisionQueryDto) {
    return this.supervisorDao.listarUsuariosPendientes(query.limite);
  }

  async colaEvidencias(
    query: SupervisionQueryDto,
  ): Promise<{ items: ParticipacionConReto[]; total: number }> {
    return this.participacionesService.listarEvidenciasPendientes(query.limite);
  }

  async revisarEvidencia(
    idParticipacion: number,
    dto: RevisionEvidenciaDto,
    idUsuarioRevisor: number,
  ) {
    if (dto.estadoParticipacion === EstadoEvaluacion.Enviado) {
      throw new BadRequestException('La evidencia debe quedar Aprobado, Negado o Bloqueado');
    }

    return this.participacionesService.revisar(idParticipacion, dto, idUsuarioRevisor);
  }

  /**
   * Un reto solo puede aprobarse, bloquearse o finalizarse. Nunca vuelve a Pendiente_Aprobacion
   * y no se finalize un reto que todavia no fue aprobado.
   */
  async decidirReto(idReto: number, dto: DecisionRetoDto) {
    const reto = await this.retosService.obtener(idReto);

    if (dto.estadoReto === EstadoReto.PendienteAprobacion) {
      throw new BadRequestException('El reto ya se encuentra en estado Pendiente_Aprobacion');
    }

    if (dto.estadoReto === EstadoReto.Finalizado && reto.estadoReto === EstadoReto.PendienteAprobacion) {
      throw new BadRequestException('No se puede finalizar un reto que aun no fue aprobado');
    }

    if (reto.estadoReto === EstadoReto.Finalizado && dto.estadoReto !== EstadoReto.Finalizado) {
      throw new BadRequestException('El reto ya se finalized y no admite cambios de estado');
    }

    return this.retosService.cambiarEstado(idReto, dto.estadoReto);
  }
}
