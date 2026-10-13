import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  ActualizarUsuario,
  CambiarEstadoUsuario,
  CambiarRolUsuario,
  EstadoCanjePremio,
  HistorialPremioAdmin,
  ParticipacionHistorial,
  ResumenAdmin,
} from '../models/admin.model';
import type { ListadoPaginado, ResultadoEliminacion } from '../models/api.model';
import type { ConsultarParticipaciones } from '../models/participacion.model';
import type { ConsultarUsuarios, Rol, Usuario } from '../models/usuario.model';

/**
 * Consumo de /gg/admin. Todo el modulo exige rol Administrador.
 *
 * A diferencia de /gg/usuarios, aqui el solicitante se resuelve en el backend
 * para filtrar lo que no le corresponde ver; el cliente solo manda los
 * filtros de busqueda. Al ser el Administrador el que pide, las filas vuelven
 * completas (correo y cedula incluidos), por eso el listado tipa Usuario.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  resumen(): Observable<ResumenAdmin> {
    return this.api.get('admin/resumen');
  }

  listarUsuarios(consulta?: ConsultarUsuarios): Observable<ListadoPaginado<Usuario>> {
    return this.api.get('admin/usuarios', consulta);
  }

  /** Historial de participaciones de todos los estudiantes, con nombres resueltos. */
  listarParticipaciones(
    consulta?: ConsultarParticipaciones,
  ): Observable<ListadoPaginado<ParticipacionHistorial>> {
    return this.api.get('admin/participaciones', consulta);
  }

  rolesDisponibles(): Observable<Rol[]> {
    return this.api.get('admin/roles');
  }

  cambiarEstado(idUsuario: number, cambios: CambiarEstadoUsuario): Observable<Usuario> {
    return this.api.patch(`admin/usuarios/${idUsuario}/estado`, cambios);
  }

  /** El backend rechaza cambiarse el rol a uno mismo. */
  cambiarRol(idUsuario: number, cambios: CambiarRolUsuario): Observable<Usuario> {
    return this.api.patch(`admin/usuarios/${idUsuario}/rol`, cambios);
  }

  activar(idUsuario: number): Observable<Usuario> {
    return this.api.post(`admin/usuarios/${idUsuario}/activar`, {});
  }

  /** El backend rechaza eliminar la propia cuenta. */
  eliminar(idUsuario: number): Observable<ResultadoEliminacion> {
    return this.api.delete(`admin/usuarios/${idUsuario}`);
  }

  /** Actualiza un usuario (solo admin). */
  actualizarUsuario(idUsuario: number, datos: ActualizarUsuario): Observable<Usuario> {
    return this.api.patch(`admin/usuarios/${idUsuario}`, datos);
  }

  /** Historial de canjes de premios (solo admin). */
  listarHistorialPremios(
    pagina = 1,
    limite = 15,
    busqueda?: string,
    estadoCanjePremio?: string,
  ): Observable<{ items: HistorialPremioAdmin[]; total: number }> {
    return this.api.get('admin/canjes', { pagina, limite, busqueda, estado: estadoCanjePremio });
  }

  /** Cambia el estado de un canje de premio (solo admin). */
  actualizarEstadoCanjePremio(idHistorialPremio: number, estadoCanjePremio: EstadoCanjePremio, observacionCanje?: string): Observable<void> {
    return this.api.patch(`admin/canjes/${idHistorialPremio}/estado`, { estadoCanjePremio, observacionCanje });
  }
}
