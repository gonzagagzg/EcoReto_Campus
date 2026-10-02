import type { DeepPartial } from 'typeorm';
import type { EstadoUsuario, Rol } from '../entities/usuario.entity';
import type { Usuario } from '../entities/usuario.entity';
import type { Gusto } from '../entities/gusto.entity';
import type { EstadoGusto } from '../entities/gusto.entity';

export const USUARIO_DAO = 'USUARIO_DAO';

export interface FiltrosUsuario {
  estado?: EstadoUsuario;
  rol?: Rol;
  busqueda?: string;
  /** Oculta las cuentas dadas de baja (estado 'desactivo'). Sólo el staff las ve. */
  excluirDesactivados?: boolean;
  skip?: number;
  take?: number;
}

export interface FiltrosGusto {
  busqueda?: string;
  estado?: EstadoGusto;
  skip?: number;
  take?: number;
}

export interface UsuarioDaoInterface {
  /** Top de usuarios ordenados por puntos descendentes, filtrado por rol. */
  listarTopPorPuntos(rol: Rol, limite: number): Promise<Usuario[]>;
  crear(datos: DeepPartial<Usuario>): Promise<Usuario>;
  buscarPorId(idUsuario: number): Promise<Usuario | null>;
  buscarPorIdConContrasena(idUsuario: number): Promise<Usuario | null>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  buscarPorCorreoConContrasena(correo: string): Promise<Usuario | null>;
  buscarPorCedula(cedula: string): Promise<Usuario | null>;
  existeCorreoOCedula(correo: string, cedula: string): Promise<boolean>;
  listar(filtros: FiltrosUsuario): Promise<{ items: Usuario[]; total: number }>;
  actualizar(idUsuario: number, datos: DeepPartial<Usuario>): Promise<Usuario>;
  actualizarEstado(idUsuario: number, estado: EstadoUsuario): Promise<Usuario>;
  cambiarRol(idUsuario: number, rol: Rol): Promise<Usuario>;
  establecerProgreso(idUsuario: number, progreso: ProgresoUsuario): Promise<void>;
  eliminar(idUsuario: number): Promise<boolean>;
  listarGustos(idUsuario: number): Promise<Gusto[]>;
  listarCatalogoGustos(): Promise<Gusto[]>;
  /** Listado de gustos para admin con filtros y paginación. */
  listarGustosAdmin(filtros: FiltrosGusto): Promise<{ items: Gusto[]; total: number }>;
  /** Busca un gusto por ID. */
  buscarGustoPorId(idGusto: number): Promise<Gusto | null>;
  /** Crea un nuevo gusto. */
  crearGusto(datos: DeepPartial<Gusto>): Promise<Gusto>;
  /** Actualiza un gusto existente. */
  actualizarGusto(idGusto: number, datos: DeepPartial<Gusto>): Promise<Gusto>;
  /** Elimina (baja lógica) un gusto. */
  eliminarGusto(idGusto: number): Promise<boolean>;
  reemplazarGustos(idUsuario: number, idsGustos: number[]): Promise<GustoUsuarioResultado[]>;
  contarPorEstado(): Promise<{ estado: EstadoUsuario; total: number }[]>;
  obtenerIdsUsuarios(): Promise<number[]>;
}

export interface ProgresoUsuario {
  puntos: number;
  retosCumplidos: number;
  nivel: number;
}

export interface GustoUsuarioResultado {
  idGustoUsuario: number;
  idGusto: number;
  nombreGusto: string;
}
