import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface EstadoConexion {
  conectado: boolean;
  mensaje: string;
}

@Injectable()
export class AppService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Consulta real a la base: si el servidor no responde, cae al catch y
   * devuelve conectado=false con el detalle del error.
   */
  async getEstadoConexion(): Promise<EstadoConexion> {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        conectado: true,
        mensaje: 'ok',
      };
    } catch (error) {
      const detalle = error instanceof Error ? error.message : 'Error desconocido';

      return {
        conectado: false,
        mensaje: `${detalle}`,
      };
    }
  }
}
