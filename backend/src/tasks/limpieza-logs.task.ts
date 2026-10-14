import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogsService } from '../modules/logs/services/logs.service';

const DIAS_RETENCION = 30;

/** Borra los logs con mas de 30 dias para que la tabla no crezca sin limite. */
@Injectable()
export class LimpiezaLogsTask {
  private readonly logger = new Logger(LimpiezaLogsTask.name);

  constructor(private readonly logsService: LogsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'limpieza-logs' })
  async purgarAntiguos(): Promise<void> {
    try {
      const limite = new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000);
      const eliminados = await this.logsService.purgarAnteriores(limite);

      this.logger.log(`Logs purgados (mas de ${DIAS_RETENCION} dias): ${eliminados}`);
    } catch (error) {
      this.logger.error(
        `Error purgando logs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
