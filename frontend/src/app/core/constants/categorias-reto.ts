/** Categorías predefinidas de reto, espejo del tipo categoria_reto_enum de la BD. */
export const CATEGORIAS_RETO = [
  'Reciclaje',
  'Ahorro de agua',
  'Energía limpia',
  'Movilidad sostenible',
  'Naturaleza y biodiversidad',
  'Comunidad y voluntariado',
  'Consumo responsable',
  'Educación ambiental',
] as const;

export type CategoriaReto = (typeof CATEGORIAS_RETO)[number];