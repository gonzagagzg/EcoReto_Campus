import { Inject, Injectable } from '@nestjs/common';
import { PremiosDao } from '../../premios/daos/premios.dao';
import { EstadoReto } from '../../retos/entities/reto.entity';
import { calcularNivel, factorPorEvidencias } from '../../retos/reglas-reto';
import { USUARIO_DAO, type UsuarioDaoInterface } from '../../usuarios/daos/usuario.dao.interface';
import { ParticipacionesDao, type PuntosParticipacion } from '../daos/participaciones.dao';
import { EstadoEvaluacion } from '../entities/participacion.entity';

export interface ProgresoUsuarioResultado {
  puntos: number;
  historialPuntos: number;
  retosCumplidos: number;
  nivel: number;
}

/**
 * Unica fuente de verdad del progreso de un usuario (puntos, historial,
 * retos cumplidos y nivel). Tanto la revision inmediata como la cron
 * nocturna llaman a esta misma funcion, de modo que ambos caminos nunca
 * divergen.
 *
 * Reglas por reto, segun las evidencias aprobadas sobre los dias requeridos:
 * - Todos los dias requeridos aprobados: paga el 100% al instante y el reto
 *   cuenta como cumplido (aun estando Activo).
 * - Incompleto: no paga nada mientras el reto siga abierto; al cerrar
 *   (Finalizado o vencido) liquida el tramo 25% / 50% / 75%.
 * - Sin evidencias aprobadas: 0. El saldo nunca baja de 0 ni de lo ya
 *   canjeado (puntos = max(0, ganados - canjeados)).
 */
@Injectable()
export class ProgresoPuntosService {
  constructor(
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
    private readonly participacionesDao: ParticipacionesDao,
    private readonly premiosDao: PremiosDao,
  ) {}

  async recalcularUsuario(idUsuario: number): Promise<ProgresoUsuarioResultado> {
    const participaciones = await this.participacionesDao.obtenerPuntosPorUsuario(idUsuario);
    const ahora = Date.now();

    const retos = new Map<
      number,
      { aprobadas: number; requeridas: number; puntosCompletado: number; cerrado: boolean }
    >();

    for (const participacion of participaciones) {
      const reto = retos.get(participacion.idReto) ?? {
        aprobadas: 0,
        requeridas: participacion.diasEstimados,
        puntosCompletado: participacion.puntosCompletado,
        cerrado: esRetoCerrado(participacion, ahora),
      };

      if (participacion.estado === EstadoEvaluacion.Aprobado) {
        reto.aprobadas += 1;
      }

      retos.set(participacion.idReto, reto);
    }

    let ganados = 0;
    let retosCumplidos = 0;

    for (const reto of retos.values()) {
      const completado = reto.aprobadas >= reto.requeridas && reto.aprobadas > 0;

      if (completado) {
        retosCumplidos += 1;
      }

      const factor = factorPorEvidencias(reto.aprobadas, reto.requeridas);

      // El cumplimiento total se paga al instante; un tramo parcial recien
      // se liquida cuando el reto cierra.
      if (factor === 0 || (!completado && !reto.cerrado)) {
        continue;
      }

      ganados += Math.round(reto.puntosCompletado * factor);
    }

    const canjeados = await this.premiosDao.puntosCanjeados(idUsuario);
    const puntos = Math.max(0, ganados - canjeados);
    const nivel = calcularNivel(retosCumplidos);

    await this.usuarioDao.establecerProgreso(idUsuario, {
      puntos,
      historialPuntos: ganados,
      retosCumplidos,
      nivel,
    });

    return { puntos, historialPuntos: ganados, retosCumplidos, nivel };
  }
}

function esRetoCerrado(participacion: PuntosParticipacion, ahora: number): boolean {
  return (
    participacion.estadoReto === EstadoReto.Finalizado ||
    new Date(participacion.fechaLimite).getTime() <= ahora
  );
}
