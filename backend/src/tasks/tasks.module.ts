import { Module } from '@nestjs/common';
import { LogsModule } from '../modules/logs/logs.module';
import { ParticipacionesModule } from '../modules/participaciones/participaciones.module';
import { PremiosModule } from '../modules/premios/premios.module';
import { RetosModule } from '../modules/retos/retos.module';
import { UsuariosModule } from '../modules/usuarios/usuarios.module';
import { CalculoPuntosTask } from './calculo-puntos.task';
import { LimpiezaLogsTask } from './limpieza-logs.task';
import { LimpiezaRetosTask } from './limpieza-retos.task';
import { TasksController } from './tasks.controller';

@Module({
  imports: [UsuariosModule, RetosModule, ParticipacionesModule, PremiosModule, LogsModule],
  providers: [LimpiezaRetosTask, CalculoPuntosTask, LimpiezaLogsTask],
  exports: [LimpiezaRetosTask, CalculoPuntosTask, LimpiezaLogsTask],
  controllers: [TasksController],
})
export class TasksModule {}
