import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { ParticipacionesModule } from '../participaciones/participaciones.module';
import { Reto } from '../retos/entities/reto.entity';
import { RetosModule } from '../retos/retos.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { SupervisorController } from './controllers/supervisor.controller';
import { SupervisorDao } from './daos/supervisor.dao';
import { SupervisorService } from './services/supervisor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reto, Participacion, Usuario]),
    RetosModule,
    ParticipacionesModule,
    UsuariosModule,
  ],
  controllers: [SupervisorController],
  providers: [SupervisorService, SupervisorDao],
  exports: [SupervisorService],
})
export class SupervisorModule {}
