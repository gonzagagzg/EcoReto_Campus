import { Controller, Get } from '@nestjs/common';
import { AppService, type EstadoConexion } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getEstadoConexion(): Promise<EstadoConexion> {
    return this.appService.getEstadoConexion();
  }
}
