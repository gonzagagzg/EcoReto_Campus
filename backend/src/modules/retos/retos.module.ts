import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { RetosController } from './controllers/retos.controller';
import { RETO_DAO } from './daos/reto.dao.interface';
import { RetoDao } from './daos/reto.dao';
import { Reto } from './entities/reto.entity';
import { RetoParticipante } from './entities/reto_participante.entity';
import { RetosService } from './services/retos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reto, RetoParticipante, Usuario])],
  controllers: [RetosController],
  providers: [RetosService, { provide: RETO_DAO, useClass: RetoDao }],
  exports: [RETO_DAO, RetosService, TypeOrmModule],
})
export class RetosModule {}
