import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListadoPaginado, ResultadoEliminacion } from '../models/api.model';
import type { Gusto, GustosUsuario, EstadoGusto, ConsultarGustos } from '../models/gusto.model';
import type {
  ActualizarPerfil,
  ActualizarUsuario,
  ConsultarUsuarios,
  EstadoUsuario,
  PerfilCompleto,
  PerfilPublico,
  Usuario,
} from '../models/usuario.model';

/**
 * Consumo de /gg/usuarios.
 *
 * Regla de acceso del backend: el propio usuario solo edita perfil y gustos;
 * el Administrador puede editar, cambiar estado y eliminar a cualquiera.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(consulta?: ConsultarUsuarios): Observable<ListadoPaginado<PerfilPublico>> {
    return this.api.get('usuarios', consulta);
  }

  /** Perfil propio con gustos y estadisticas de nivel y puntos. */
  perfil(): Observable<PerfilCompleto> {
    return this.api.get('usuarios/perfil');
  }

  actualizarPerfil(cambios: ActualizarPerfil): Observable<Usuario> {
    return this.api.put('usuarios/perfil', cambios);
  }

  subirFoto(foto: File): Observable<Usuario> {
    const cuerpo = new FormData();
    cuerpo.append('foto', foto);

    return this.api.put('usuarios/perfil/foto', cuerpo);
  }

  /** Devuelve el perfil completo si se consulta a uno mismo, el publico si es otro. */
  obtener(idUsuario: number): Observable<PerfilCompleto | PerfilPublico> {
    return this.api.get(`usuarios/${idUsuario}`);
  }

  actualizar(idUsuario: number, cambios: ActualizarUsuario): Observable<Usuario> {
    return this.api.put(`usuarios/${idUsuario}`, cambios);
  }

  cambiarEstado(idUsuario: number, estado: EstadoUsuario): Observable<Usuario> {
    return this.api.patch(`usuarios/${idUsuario}/estado`, { estado });
  }

  eliminar(idUsuario: number): Observable<ResultadoEliminacion> {
    return this.api.delete(`usuarios/${idUsuario}`);
  }

  /** Top de estudiantes por puntos; no incluye supervisores ni administradores. */
  topUsuarios(): Observable<Usuario[]> {
    return this.api.get('usuarios/top');
  }

  /** Catalogo completo de intereses, sin filtrar por usuario. */
  catalogoGustos(): Observable<Gusto[]> {
    return this.api.get('usuarios/gustos');
  }

  gustosDe(idUsuario: number): Observable<Gusto[]> {
    return this.api.get(`usuarios/${idUsuario}/gustos`);
  }

  /** Reemplaza la lista entera de gustos: el backend no agrega ni quita de a uno. */
  guardarGustos(idUsuario: number, gustos: GustosUsuario): Observable<Gusto[]> {
    return this.api.put(`usuarios/${idUsuario}/gustos`, gustos);
  }

  /** Catálogo de gustos para admin (con filtros y paginación). */
  listarGustosAdmin(consulta?: ConsultarGustos): Observable<ListadoPaginado<Gusto>> {
    return this.api.get('usuarios/gustos/admin', consulta);
  }

  /** Obtiene un gusto por ID (admin). */
  obtenerGusto(idGusto: number): Observable<Gusto> {
    return this.api.get(`usuarios/gustos/${idGusto}`);
  }

  /** Crea un nuevo gusto (admin). */
  crearGusto(datos: { nombreGusto: string; imagenGusto?: string }): Observable<Gusto> {
    return this.api.post('usuarios/gustos', datos);
  }

  /** Actualiza un gusto existente (admin). */
  actualizarGusto(idGusto: number, cambios: Partial<Gusto>): Observable<Gusto> {
    return this.api.put(`usuarios/gustos/${idGusto}`, cambios);
  }

  /** Elimina (baja lógica) un gusto (admin). */
  eliminarGusto(idGusto: number): Observable<ResultadoEliminacion> {
    return this.api.delete(`usuarios/gustos/${idGusto}`);
  }

  /** Sube la imagen del gusto (jpg, png, webp máx 5 MB). Sobrescribe si existe. */
  subirImagenGusto(idGusto: number, archivo: File): Observable<{ imagenGusto: string }> {
    const formData = new FormData();
    formData.append('imagen', archivo);
    return this.api.postFormData(`usuarios/gustos/${idGusto}/imagen`, formData);
  }

  /** Elimina la imagen del gusto y su carpeta en el servidor. */
  eliminarImagenGusto(idGusto: number): Observable<{ eliminado: boolean }> {
    return this.api.delete(`usuarios/gustos/${idGusto}/imagen`);
  }
}
