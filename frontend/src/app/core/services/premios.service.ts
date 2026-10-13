import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListadoPaginado, ResultadoEliminacion } from '../models/api.model';
import type {
  ActualizarPremio,
  CanjearPremio,
  CrearPremio,
  HistorialPremio,
  ConsultarPremios,
  Premio,
} from '../models/premio.model';

/**
 * Consumo de /gg/premios.
 *
 * Crear, editar y eliminar es solo Administrador; canjear es del propio
 * usuario y descuenta los puntos en el servidor. Ahora admite subir
 * imagen al premio (carpeta por ID, archivo por ID, sobrescribe).
 */
@Injectable({ providedIn: 'root' })
export class PremiosService {
  private readonly api = inject(ApiService);

  /** Catálogo público: solo premios activos. */
  listarCatalogo(consulta?: ConsultarPremios): Observable<ListadoPaginado<Premio>> {
    return this.api.get('premios', consulta);
  }

  /** Panel admin: admins ven todos (activos y desactivados). */
  listarAdmin(consulta?: ConsultarPremios): Observable<ListadoPaginado<Premio>> {
    return this.api.get('premios/admin', consulta);
  }

  obtener(idPremio: number): Observable<Premio> {
    return this.api.get(`premios/${idPremio}`);
  }

  historial(): Observable<HistorialPremio[]> {
    return this.api.get('premios/mi-historial');
  }

  canjear(datos: CanjearPremio): Observable<HistorialPremio> {
    return this.api.post('premios/canjear', datos);
  }

  crear(datos: CrearPremio): Observable<Premio> {
    return this.api.post('premios', datos);
  }

  actualizar(idPremio: number, cambios: ActualizarPremio): Observable<Premio> {
    return this.api.put(`premios/${idPremio}`, cambios);
  }

  eliminar(idPremio: number): Observable<ResultadoEliminacion> {
    return this.api.delete(`premios/${idPremio}`);
  }

  /** Sube la imagen del premio (jpg, png, webp máx 5 MB). Sobrescribe si existe. */
  subirImagen(idPremio: number, archivo: File): Observable<{ imagenPremio: string }> {
    const formData = new FormData();
    formData.append('imagen', archivo);
    return this.api.postFormData(`premios/${idPremio}/imagen`, formData);
  }

  /** Elimina la imagen del premio y su carpeta en el servidor. */
  eliminarImagen(idPremio: number): Observable<{ eliminado: boolean }> {
    return this.api.delete(`premios/${idPremio}/imagen`);
  }
}
