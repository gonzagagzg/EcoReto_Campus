import { Dificultad } from './entities/reto.entity';

/** Reglas de dificultad, puntos y nivel del modulo de retos. Funciones puras y sin dependencias. */

export const DIAS_MINIMOS_RETO = 5;
export const DIAS_MAXIMOS_RETO = 300;

export const UMBRAL_FACIL_DIAS = 50;
export const UMBRAL_MEDIO_DIAS = 150;

export const PUNTOS_POR_CADA_5_DIAS = 5;
export const PUNTOS_POR_CADA_50_DIAS = 50;

export const MAX_PUNTOS_FACIL = 50;
export const MAX_PUNTOS_MEDIO = 150;
export const MAX_PUNTOS_DIFICIL = 300;

/** porcentaje de puntos al participar sin completar el reto */
export const PORCENTAJE_POR_PARTICIPAR = 0.25;

/** porcentaje minimo de dias para obtener el pago parcial del 50% */
export const PORCENTAJE_CUMPLIMIENTO_PARCIAL = 0.5;

export const NIVEL_MAXIMO = 100;

const MS_POR_DIA = 86_400_000;

export interface PuntajeReto {
  diasEstimados: number;
  dificultad: Dificultad;
  puntosCompletado: number;
  puntosParticipar: number;
}

/** Dias continuos estimados entre la creacion y la fecha limite. */
export function calcularDiasEstimados(fechaCreacion: Date, fechaLimite: Date): number {
  const dias = Math.ceil((fechaLimite.getTime() - fechaCreacion.getTime()) / MS_POR_DIA);
  return Math.max(0, dias);
}

/** Facil: 5 a 50 dias. Medio: mas de 50 hasta 150. Dificil: mas de 150 hasta 300. */
export function calcularDificultad(diasEstimados: number): Dificultad {
  if (diasEstimados <= UMBRAL_FACIL_DIAS) {
    return Dificultad.Facil;
  }

  if (diasEstimados <= UMBRAL_MEDIO_DIAS) {
    return Dificultad.Medio;
  }

  return Dificultad.Dificil;
}

/**
 * Facil: 5 puntos por cada 5 dias, tope 50.
 * Medio: base 50 y 50 puntos mas por cada 50 dias adicionales sobre 50, tope 150.
 * Dificil: base 150 y 50 puntos mas por cada 50 dias adicionales sobre 150, tope 300.
 */
export function calcularPuntosCompletado(
  diasEstimados: number,
  dificultad: Dificultad = calcularDificultad(diasEstimados),
): number {
  if (dificultad === Dificultad.Facil) {
    const bloques = Math.floor(diasEstimados / 5);
    return Math.min(MAX_PUNTOS_FACIL, bloques * PUNTOS_POR_CADA_5_DIAS);
  }

  if (dificultad === Dificultad.Medio) {
    const bloques = Math.floor((diasEstimados - UMBRAL_FACIL_DIAS) / 50);
    return Math.min(MAX_PUNTOS_MEDIO, MAX_PUNTOS_FACIL + bloques * PUNTOS_POR_CADA_50_DIAS);
  }

  const bloques = Math.floor((diasEstimados - UMBRAL_MEDIO_DIAS) / 50);
  return Math.min(MAX_PUNTOS_DIFICIL, MAX_PUNTOS_MEDIO + bloques * PUNTOS_POR_CADA_50_DIAS);
}

export function calcularPuntosParticipar(puntosCompletado: number): number {
  return Math.round(puntosCompletado * PORCENTAJE_POR_PARTICIPAR);
}

/** Calcula el puntaje completo de un reto a partir de su duracion. */
export function calcularPuntajeReto(fechaCreacion: Date, fechaLimite: Date): PuntajeReto {
  const diasEstimados = calcularDiasEstimados(fechaCreacion, fechaLimite);
  const dificultad = calcularDificultad(diasEstimados);
  const puntosCompletado = calcularPuntosCompletado(diasEstimados, dificultad);

  return {
    diasEstimados,
    dificultad,
    puntosCompletado,
    puntosParticipar: calcularPuntosParticipar(puntosCompletado),
  };
}

/**
 * Pago proporcional al vencer el reto: 100% si cumplio todos los dias estimados,
 * 50% si cumplio al menos la mitad (minimo 2 de cada 4) y 0% por debajo de eso.
 */
export function factorCumplimiento(diasEstimados: number, diasCumplidos: number | null): number {
  if (diasCumplidos === null || diasCumplidos === undefined) {
    return 1;
  }

  if (diasCumplidos >= diasEstimados) {
    return 1;
  }

  const minimoParcial = Math.ceil(diasEstimados * PORCENTAJE_CUMPLIMIENTO_PARCIAL);

  return diasCumplidos >= minimoParcial ? 0.5 : 0;
}

/** Nivel 0 con 1 reto cumplido, nivel 1 con 2, nivel 2 con 4... hasta el nivel 100. */
export function calcularNivel(retosCumplidos: number): number {
  let nivel = 0;
  let retosRequeridos = 1;

  while (retosCumplidos >= retosRequeridos * 2 && nivel < NIVEL_MAXIMO) {
    retosRequeridos *= 2;
    nivel += 1;
  }

  return nivel;
}

export function retosRequeridosParaNivel(nivel: number): number {
  return 2 ** Math.max(0, Math.min(nivel, NIVEL_MAXIMO));
}
