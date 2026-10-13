/** Estados posibles de un gusto. */
export enum EstadoGusto {
  Activo = 'activo',
  Desactivo = 'desactivo',
}

/** Catalogo de intereses que el usuario puede marcar en su perfil. */
export interface Gusto {
  idGusto: number;
  nombreGusto: string;
  imagenGusto: string | null;
  estado: EstadoGusto;
}

/** Gustos enviados por el usuario en PUT /gg/usuarios/:id/gustos. */
export interface GustosUsuario {
  idsGustos: number[];
}

/** Filtros para listado de gustos (admin). */
export type ConsultarGustos = {
  pagina?: number;
  limite?: number;
  busqueda?: string;
  estado?: EstadoGusto;
};
