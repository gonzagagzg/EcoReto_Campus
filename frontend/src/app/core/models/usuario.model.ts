import type { Gusto } from './gusto.model';

/** Roles del sistema, en el mismo orden que el backend. */
export enum Rol {
  Usuario = 'Usuario',
  Supervisor = 'Supervisor',
  Administrador = 'Administrador',
}

/** Estados posibles de una cuenta de usuario. */
export enum EstadoUsuario {
  Pendiente = 'pendiente',
  Activo = 'activo',
  Desactivo = 'desactivo',
  Bloqueado = 'bloqueado',
}

/** Usuario tal como lo devuelve el backend. */
export interface Usuario {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  alias: string;
  carrera: string | null;
  nivelCarrera: string | null;
  centroEstudios: string | null;
  cedula: string;
  imagenUsuario: string | null;
  rol: Rol;
  estado: EstadoUsuario;
  puntos: number;
  historialPuntos: number;
  retosCumplidos: number;
  nivel: number;
}

/** Lo que se devuelve al consultar un usuario ajeno: sin datos sensibles, con gustos. */
export interface PerfilPublico extends Omit<Usuario, 'correo' | 'cedula'> {
  gustos: Gusto[];
}

/** Perfil propio con los gustos y las estadisticas calculadas. */
export interface PerfilCompleto extends Usuario {
  gustos: Gusto[];
  estadisticas: EstadisticasUsuario;
}

export interface EstadisticasUsuario {
  nivel: number;
  puntos: number;
  retosCumplidos: number;
  /** null cuando el usuario ya llego al nivel maximo. */
  retosRequeridosParaSiguienteNivel: number | null;
  /** Avance hacia el siguiente nivel, de 0 a 100. */
  progresoNivel: number;
}

/** Filtros admitidos por GET /gg/usuarios y GET /gg/admin/usuarios. */
export type ConsultarUsuarios = {
  busqueda?: string;
  rol?: Rol;
  estado?: EstadoUsuario;
  pagina?: number;
  limite?: number;
};

/** PUT /gg/usuarios/perfil: el propio usuario no puede cambiar ni correo ni cedula. */
export interface ActualizarPerfil {
  alias?: string;
  carrera?: string;
  nivelCarrera?: string;
  centroEstudios?: string;
  contrasena?: string;
}

/** PUT /gg/usuarios/:id: edicion completa para el Administrador. */
export interface ActualizarUsuario {
  nombre?: string;
  apellido?: string;
  alias?: string;
  carrera?: string;
  nivelCarrera?: string;
  centroEstudios?: string;
  cedula?: string;
  correo?: string;
  contrasena?: string;
}
