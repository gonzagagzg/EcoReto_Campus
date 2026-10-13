import type { Dificultad } from '../../core/models/reto.model';

export type TonoInsignia = 'verde' | 'lit' | 'oro' | 'cian' | 'negra' | 'neutra' | 'gris' | 'rojo';

/**
 * Tabla que traduce los estados crudos del backend a tono de insignia y
 * etiqueta legible. Cubre EstadoReto, EstadoEvaluacion, EstadoUsuario, Rol y
 * Dificultad; lo que no se conoce cae en neutro con el valor tal cual.
 */
const TABLA: Record<string, { tono: TonoInsignia; texto: string }> = {
  // EstadoReto
  Pendiente_Aprobacion: { tono: 'oro', texto: 'Pendiente' },
  Activo: { tono: 'verde', texto: 'Activo' },
  Finalizado: { tono: 'negra', texto: 'Finalizado' },
  Bloqueado: { tono: 'rojo', texto: 'Bloqueado' },
  Desactivado: { tono: 'gris', texto: 'Desactivado' },

  // EstadoEvaluacion
  Enviado: { tono: 'cian', texto: 'Enviado' },
  Aprobado: { tono: 'verde', texto: 'Aprobado' },
  Negado: { tono: 'rojo', texto: 'Negado' },

  // EstadoUsuario
  pendiente: { tono: 'oro', texto: 'Pendiente' },
  activo: { tono: 'verde', texto: 'Activo' },
  desactivo: { tono: 'gris', texto: 'Desactivado' },
  bloqueado: { tono: 'rojo', texto: 'Bloqueado' },

  // Rol
  Usuario: { tono: 'neutra', texto: 'Usuario' },
  Supervisor: { tono: 'cian', texto: 'Supervisor' },
  Administrador: { tono: 'oro', texto: 'Admin' },

  // Dificultad
  Fácil: { tono: 'lit', texto: 'Fácil' },
  Medio: { tono: 'oro', texto: 'Medio' },
  Difícil: { tono: 'rojo', texto: 'Difícil' },
};

export function insigniaDe(valor: string | Dificultad | null | undefined): {
  tono: TonoInsignia;
  texto: string;
} {
  if (!valor) {
    return { tono: 'neutra', texto: '-' };
  }

  return TABLA[valor] ?? { tono: 'neutra', texto: valor };
}
