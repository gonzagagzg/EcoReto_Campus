import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { EstadoConexion } from '../models/api.model';

/**
 * Comprobacion de que el backend esta arriba y con la base de datos
 * conectada: GET /gg/.
 *
 * El backend solo puede responder `conectado: false` si la base de datos se
 * cayo *despues* de arrancar, porque con ella caida TypeORM aborta el
 * bootstrap y el proceso ni siquiera levanta.
 */
@Injectable({ providedIn: 'root' })
export class EstadoConexionService {
  private readonly api = inject(ApiService);

  consultar(): Observable<EstadoConexion> {
    return this.api.get<EstadoConexion>('');
  }
}
