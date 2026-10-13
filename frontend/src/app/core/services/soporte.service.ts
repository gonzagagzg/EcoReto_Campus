import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ConteoPorEstado } from '../models/admin.model';
import type { ListadoPaginado } from '../models/api.model';
import type { EstadoEvaluacion } from '../models/participacion.model';
import type {
  ConsultarSoporte,
  CrearSoporte,
  ResponderSoporte,
  Soporte,
} from '../models/soporte.model';

/**
 * Consumo de /gg/soporte.
 *
 * El estudiante crea y consulta sus propios tickets; el listado global, las
 * estadisticas y responder son exclusivos del Administrador. Un ticket ya
 * respondido no se puede reabrir.
 */
@Injectable({ providedIn: 'root' })
export class SoporteService {
  private readonly api = inject(ApiService);

  crear(datos: CrearSoporte): Observable<Soporte> {
    if (!datos.imagen) {
      return this.api.post('soporte', datos);
    }

    const { imagen, ...campos } = datos;
    const cuerpo = new FormData();

    for (const [clave, valor] of Object.entries(campos)) {
      if (valor !== undefined && valor !== null) {
        cuerpo.append(clave, String(valor));
      }
    }
    cuerpo.append('imagen', imagen);

    return this.api.post('soporte', cuerpo);
  }

  misTickets(consulta?: ConsultarSoporte): Observable<ListadoPaginado<Soporte>> {
    return this.api.get('soporte/mis-tickets', consulta);
  }

  /** Solo Administrador. */
  listar(consulta?: ConsultarSoporte): Observable<ListadoPaginado<Soporte>> {
    return this.api.get('soporte', consulta);
  }

  /** Solo Administrador. */
  estadisticas(): Observable<ConteoPorEstado<EstadoEvaluacion>[]> {
    return this.api.get('soporte/estadisticas');
  }

  obtener(idSoporte: number): Observable<Soporte> {
    return this.api.get(`soporte/${idSoporte}`);
  }

  /** Solo Administrador. Al aprobar aplica los cambios de perfil que traiga el cuerpo. */
  responder(idSoporte: number, respuesta: ResponderSoporte): Observable<Soporte> {
    return this.api.post(`soporte/${idSoporte}/responder`, respuesta);
  }
}
