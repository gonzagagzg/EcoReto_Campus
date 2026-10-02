import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reto } from '../retos/entities/reto.entity';
import { RetoParticipante } from '../retos/entities/reto_participante.entity';
import { RetosModule } from '../retos/retos.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ParticipacionesController } from './controllers/participaciones.controller';
import { ParticipacionesDao } from './daos/participaciones.dao';
import { Participacion } from './entities/participacion.entity';
import { ParticipacionesService } from './services/participaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participacion, RetoParticipante, Reto, Usuario]),
    RetosModule,
  ],
  controllers: [ParticipacionesController],
  providers: [ParticipacionesService, ParticipacionesDao],
  exports: [ParticipacionesService, ParticipacionesDao, TypeOrmModule],
})
export class ParticipacionesModule {}
