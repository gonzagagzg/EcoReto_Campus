import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProgresoPuntosService } from '../modules/participaciones/services/progreso-puntos.service';
import { USUARIO_DAO, type UsuarioDaoInterface } from '../modules/usuarios/daos/usuario.dao.interface';

/**
 * Recalcula puntos, historial, retos cumplidos y nivel de cada usuario.
 * La logica vive en ProgresoPuntosService (la misma que usa la revision
 * inmediata): los retos completados al 100% se pagan al instante, los
 * tramos parciales (25% / 50% / 75%) se liquidan aqui al detectar que el
 * reto finalizo o vencio, y el saldo descuenta lo ya canjeadado.
 */
@Injectable()
export class CalculoPuntosTask {
  private readonly logger = new Logger(CalculoPuntosTask.name);

  constructor(
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
    private readonly progreso: ProgresoPuntosService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'calculo-puntos' })
  async recalcularTodos(): Promise<void> {
    try {
      const idsUsuarios = await this.usuarioDao.obtenerIdsUsuarios();

      for (const idUsuario of idsUsuarios) {
        await this.progreso.recalcularUsuario(idUsuario);
      }

      this.logger.log(`Progreso recalculado para ${idsUsuarios.length} usuarios`);
    } catch (error) {
      this.logger.error(
        `Error recalculando puntos: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
