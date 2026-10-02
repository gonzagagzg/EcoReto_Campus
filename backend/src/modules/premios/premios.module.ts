import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PremiosController } from './controllers/premios.controller';
import { PremiosDao } from './daos/premios.dao';
import { HistorialPremio } from './entities/historial_premio.entity';
import { Premio } from './entities/premio.entity';
import { PremiosService } from './services/premios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Premio, HistorialPremio, Usuario])],
  controllers: [PremiosController],
  providers: [PremiosService, PremiosDao],
  exports: [PremiosService, PremiosDao, TypeOrmModule],
})
export class PremiosModule {}
