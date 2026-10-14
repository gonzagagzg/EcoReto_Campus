import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PremiosModule } from '../premios/premios.module';
import { Reto } from '../retos/entities/reto.entity';
import { RetoParticipante } from '../retos/entities/reto_participante.entity';
import { RetosModule } from '../retos/retos.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ParticipacionesController } from './controllers/participaciones.controller';
import { ParticipacionesDao } from './daos/participaciones.dao';
import { Participacion } from './entities/participacion.entity';
import { ParticipacionesService } from './services/participaciones.service';
import { ProgresoPuntosService } from './services/progreso-puntos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participacion, RetoParticipante, Reto, Usuario]),
    RetosModule,
    UsuariosModule,
    PremiosModule,
  ],
  controllers: [ParticipacionesController],
  providers: [ParticipacionesService, ParticipacionesDao, ProgresoPuntosService],
  exports: [ParticipacionesService, ParticipacionesDao, ProgresoPuntosService, TypeOrmModule],
})
export class ParticipacionesModule {}
