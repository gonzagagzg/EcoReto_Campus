import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListadoPaginado } from '../models/api.model';
import type { Participacion, RevisarEvidencia } from '../models/participacion.model';
import type { DecisionReto, Reto, SupervisionQuery } from '../models/reto.model';
import type { EvidenciaPendiente, PanelSupervision } from '../models/supervisor.model';
import type { Usuario } from '../models/usuario.model';

/**
 * Consumo de /gg/supervisor. Todo el modulo exige rol Supervisor o
 * Administrador.
 *
 * Colas de trabajo: retos por aprobar, evidencias por revisar y usuarios por
 * activar, mas el conteo de tickets de soporte pendientes.
 */
@Injectable({ providedIn: 'root' })
export class SupervisorService {
  private readonly api = inject(ApiService);

  panel(): Observable<PanelSupervision> {
    return this.api.get('supervisor/panel');
  }

  retosPendientes(consulta?: SupervisionQuery): Observable<Reto[]> {
    return this.api.get('supervisor/retos-pendientes', consulta);
  }

  evidenciasPendientes(
    consulta?: SupervisionQuery,
  ): Observable<ListadoPaginado<EvidenciaPendiente>> {
    return this.api.get('supervisor/evidencias', consulta);
  }

  usuariosPendientes(consulta?: SupervisionQuery): Observable<Usuario[]> {
    return this.api.get('supervisor/usuarios-pendientes', consulta);
  }

  decidirReto(idReto: number, decision: DecisionReto): Observable<Reto> {
    return this.api.post(`supervisor/retos/${idReto}/decision`, decision);
  }

  revisarEvidencia(idParticipacion: number, revision: RevisarEvidencia): Observable<Participacion> {
    return this.api.post(`supervisor/evidencias/${idParticipacion}/revision`, revision);
  }
}
