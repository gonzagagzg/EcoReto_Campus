import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListadoPaginado } from '../models/api.model';
import type {
  ConsultarParticipaciones,
  Participacion,
  ParticipacionConDetalle,
  RegistrarEvidencia,
} from '../models/participacion.model';

/**
 * Consumo de /gg/participaciones.
 *
 * La evidencia viaja como multipart con el nombre 'evidencia'; la inscripcion
 * previa al reto se hace en RetosService.participar(). El estado de revision
 * se cambia desde SupervisorService.
 */
@Injectable({ providedIn: 'root' })
export class ParticipacionesService {
  private readonly api = inject(ApiService);

  registrar(datos: RegistrarEvidencia): Observable<Participacion> {
    if (!datos.evidencia) {
      return this.api.post('participaciones', datos);
    }

    const { evidencia, ...campos } = datos;
    const cuerpo = new FormData();

    for (const [clave, valor] of Object.entries(campos)) {
      if (valor !== undefined && valor !== null) {
        cuerpo.append(clave, String(valor));
      }
    }
    cuerpo.append('evidencia', evidencia);

    return this.api.post('participaciones', cuerpo);
  }

  listarLasMias(consulta?: ConsultarParticipaciones): Observable<ListadoPaginado<Participacion>> {
    return this.api.get('participaciones/mis-participaciones', consulta);
  }

  listarLasMiasConDetalle(consulta?: ConsultarParticipaciones): Observable<ListadoPaginado<ParticipacionConDetalle>> {
    return this.api.get('participaciones/mis-participaciones-detalle', consulta);
  }

  /** Retos aprobados de otro usuario (perfil público, máx 3). */
  listarAprobadosPublicos(
    idUsuario: number,
  ): Observable<{ idReto: number; idRetosParticipantes: number; idParticipacion: number }[]> {
    return this.api.get(`participaciones/usuario/${idUsuario}/publicos`);
  }

  /** El backend devuelve 404 si la evidencia no es propia y el usuario no es staff. */
  obtener(idParticipacion: number): Observable<Participacion> {
    return this.api.get(`participaciones/${idParticipacion}`);
  }

  /**
   * Cuenta cuántas evidencias aprobadas tiene un usuario en un reto específico.
   * Cuenta TODAS las participaciones del usuario en ese reto (puede haber varias inscripciones).
   * Sirve para calcular automáticamente los días cumplidos al revisar una evidencia.
   */
  contarAprobadasPorRetoYUsuario(idReto: number, idUsuario: number): Observable<number> {
    return this.api.get<number>(`participaciones/reto/${idReto}/usuario/${idUsuario}/aprobadas`);
  }
}
