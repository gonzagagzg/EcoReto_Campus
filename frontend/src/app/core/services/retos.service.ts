import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListadoPaginado, ResultadoEliminacion } from '../models/api.model';
import type { RetoParticipante } from '../models/participacion.model';
import type { ActualizarReto, ConsultarRetos, CrearReto, Reto, RetoParticipacionActual } from '../models/reto.model';

/**
 * Consumo de /gg/retos.
 *
 * La imagen es opcional: si viene se manda como multipart con el nombre
 * 'imagen' y el backend la guarda en uploads/retos/<id>. Sin imagen se manda
 * JSON simple. Dificultad y puntos los calcula el servidor, nunca se envian.
 */
@Injectable({ providedIn: 'root' })
export class RetosService {
  private readonly api = inject(ApiService);

  listar(consulta?: ConsultarRetos): Observable<ListadoPaginado<Reto>> {
    return this.api.get('retos', consulta);
  }

  obtener(idReto: number): Observable<Reto> {
    return this.api.get(`retos/${idReto}`);
  }

  crear(datos: CrearReto): Observable<Reto> {
    if (!datos.imagen) {
      return this.api.post('retos', datos);
    }

    const { imagen, ...campos } = datos;
    const cuerpo = new FormData();

    for (const [clave, valor] of Object.entries(campos)) {
      if (valor !== undefined && valor !== null) {
        cuerpo.append(clave, String(valor));
      }
    }
    cuerpo.append('imagen', imagen);

    return this.api.post('retos', cuerpo);
  }

  actualizar(idReto: number, cambios: ActualizarReto): Observable<Reto> {
    const { imagen, ...campos } = cambios;
    if (!imagen) {
      return this.api.put(`retos/${idReto}`, campos);
    }

    const formData = new FormData();
    for (const [clave, valor] of Object.entries(campos)) {
      if (valor !== undefined && valor !== null) {
        formData.append(clave, String(valor));
      }
    }
    formData.append('imagen', imagen);
    return this.api.postFormData(`retos/${idReto}`, formData);
  }

  /** Sube la imagen del reto (jpg, png, webp máx 5 MB). Sobrescribe si existe. */
  subirImagen(idReto: number, archivo: File): Observable<{ imagenReto: string }> {
    const formData = new FormData();
    formData.append('imagen', archivo);
    return this.api.postFormData(`retos/${idReto}/imagen`, formData);
  }

  /** Elimina la imagen del reto y su carpeta en el servidor. */
  eliminarImagen(idReto: number): Observable<{ eliminado: boolean }> {
    return this.api.delete(`retos/${idReto}/imagen`);
  }

  eliminar(idReto: number): Observable<ResultadoEliminacion> {
    return this.api.delete(`retos/${idReto}`);
  }

  /** Se inscribe al reto y reserva los puntos de participacion. */
  participar(idReto: number): Observable<RetoParticipante> {
    return this.api.post(`retos/${idReto}/participar`, {});
  }

  participantes(idReto: number): Observable<RetoParticipante[]> {
    return this.api.get(`retos/${idReto}/participantes`);
  }

  /** Retos en los que el usuario participa actualmente (Activo o Finalizado). */
  listarMisParticipaciones(): Observable<RetoParticipacionActual[]> {
    return this.api.get(`retos/mis-participaciones`);
  }
}
