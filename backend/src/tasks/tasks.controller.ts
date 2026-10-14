import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../modules/usuarios/entities/usuario.entity';
import { LimpiezaRetosTask } from './limpieza-retos.task';
import { CalculoPuntosTask } from './calculo-puntos.task';
import { LimpiezaLogsTask } from './limpieza-logs.task';

/**
 * Endpoints para ejecutar manualmente las tareas programadas (crons).
 * Solo accesibles por Supervisor y Administrador.
 * Prefijo global: /gg → POST /gg/tasks/limpieza-retos, etc.
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Supervisor, Rol.Administrador)
export class TasksController {
  constructor(
    private readonly limpiezaRetosTask: LimpiezaRetosTask,
    private readonly calculoPuntosTask: CalculoPuntosTask,
    private readonly limpiezaLogsTask: LimpiezaLogsTask,
  ) {}

  @Post('limpieza-retos')
  @HttpCode(HttpStatus.OK)
  async forzarLimpiezaRetos(): Promise<{ mensaje: string; timestamp: string }> {
    await this.limpiezaRetosTask.finalizarRetosVencidos();
    return {
      mensaje: 'Limpieza de retos vencidos ejecutada manualmente',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('calculo-puntos')
  @HttpCode(HttpStatus.OK)
  async forzarCalculoPuntos(): Promise<{ mensaje: string; timestamp: string }> {
    await this.calculoPuntosTask.recalcularTodos();
    return {
      mensaje: 'Recálculo de puntos y niveles ejecutado manualmente',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('limpieza-logs')
  @HttpCode(HttpStatus.OK)
  async forzarLimpiezaLogs(): Promise<{ mensaje: string; timestamp: string }> {
    await this.limpiezaLogsTask.purgarAntiguos();
    return {
      mensaje: 'Limpieza de logs antiguos ejecutada manualmente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('estado')
  obtenerEstadoTareas(): object {
    const ahora = new Date();
    return {
      limpiezaRetos: { cron: '0 3 * * *', descripcion: 'Todos los días a las 03:00' },
      calculoPuntos: { cron: '0 4 * * *', descripcion: 'Todos los días a las 04:00' },
      limpiezaLogs: { cron: '0 2 * * 0', descripcion: 'Domingos a las 02:00' },
      zonaHorariaServidor: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ahora: ahora.toISOString(),
    };
  }
}