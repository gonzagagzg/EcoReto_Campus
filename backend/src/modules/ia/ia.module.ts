import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { HistorialPremio } from '../premios/entities/historial_premio.entity';
import { Premio } from '../premios/entities/premio.entity';
import { Reto } from '../retos/entities/reto.entity';
import { Soporte } from '../soporte/entities/soporte.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { IaController } from './controllers/ia.controller';
import { IaService } from './services/ia.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Reto, Participacion, Premio, HistorialPremio, Soporte]),
  ],
  controllers: [IaController],
  providers: [IaService],
  exports: [IaService],
})
export class IaModule {}
