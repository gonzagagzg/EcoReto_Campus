import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { buildRetoDir, eliminarCarpeta } from '../config/uploads.config';
import { RETO_DAO, type RetoDaoInterface } from '../modules/retos/daos/reto.dao.interface';

/**
 * Cierra los retos activos cuya fecha limite ya paso y elimina la carpeta de imagenes de cada
 * reto vencido. Las evidencias bloqueadas se conservan.
 * 
 * Se ejecuta:
 * 1. Automáticamente cada día a las 03:00 (cron)
 * 2. Una vez al arrancar la aplicación (onModuleInit) para catch-up si el server estaba apagado
 */
@Injectable()
export class LimpiezaRetosTask implements OnModuleInit {
  private readonly logger = new Logger(LimpiezaRetosTask.name);
  private yaEjecutadoAlIniciar = false;

  constructor(@Inject(RETO_DAO) private readonly retoDao: RetoDaoInterface) {}

  /** Catch-up al arrancar: finaliza retos que vencieron mientras el server estuvo abajo. */
  async onModuleInit(): Promise<void> {
    if (this.yaEjecutadoAlIniciar) return;
    this.yaEjecutadoAlIniciar = true;

    this.logger.log('Ejecutando limpieza de retos vencidos al iniciar la aplicación (catch-up)...');
    await this.finalizarRetosVencidos();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'limpieza-retos' })
  async finalizarRetosVencidos(): Promise<void> {
    try {
      const idsVencidos = await this.retoDao.listarIdsVencidos(new Date());
      const finalizados = await this.retoDao.finalizarVencidos(new Date());
      let carpetasEliminadas = 0;

      for (const idReto of idsVencidos) {
        if (await eliminarCarpeta(buildRetoDir(idReto))) {
          carpetasEliminadas += 1;
          // Sin esto `imagenReto` apuntaria a un archivo que ya no existe
          // y el frontend mostraria una imagen rota.
          try {
            await this.retoDao.actualizar(idReto, { imagenReto: null });
          } catch {
            // Si la BD falla, el reto ya quedo finalizado: no reintentar.
          }
        }
      }

      this.logger.log(
        `Retos finalizados por vencimiento: ${finalizados}. Carpetas de imagen eliminadas: ${carpetasEliminadas}`,
      );
    } catch (error) {
      this.logger.error(
        `Error finalizando retos vencidos: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
