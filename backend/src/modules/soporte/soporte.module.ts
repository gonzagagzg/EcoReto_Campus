import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { SoporteController } from './controllers/soporte.controller';
import { SoporteDao } from './daos/soporte.dao';
import { Soporte } from './entities/soporte.entity';
import { SoporteService } from './services/soporte.service';

@Module({
  imports: [TypeOrmModule.forFeature([Soporte, Usuario, Participacion]), UsuariosModule],
  controllers: [SoporteController],
  providers: [SoporteService, SoporteDao],
  exports: [SoporteService, SoporteDao, TypeOrmModule],
})
export class SoporteModule {}
