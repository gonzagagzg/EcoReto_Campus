import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipacionesModule } from '../participaciones/participaciones.module';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { Premio } from '../premios/entities/premio.entity';
import { Reto } from '../retos/entities/reto.entity';
import { RetoParticipante } from '../retos/entities/reto_participante.entity';
import { Soporte } from '../soporte/entities/soporte.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AdminController } from './controllers/admin.controller';
import { AdminDao } from './daos/admin.dao';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Reto, RetoParticipante, Participacion, Premio, Soporte]),
    UsuariosModule,
    ParticipacionesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminDao],
  exports: [AdminService],
})
export class AdminModule {}
