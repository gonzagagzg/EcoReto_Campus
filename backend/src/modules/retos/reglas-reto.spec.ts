import { Dificultad } from './entities/reto.entity';
import {
  calcularDiasEstimados,
  calcularDificultad,
  calcularNivel,
  calcularPuntosCompletado,
  calcularPuntosParticipar,
  factorPorEvidencias,
  finDelDia,
  retosRequeridosParaNivel,
} from './reglas-reto';

const MS_DIA = 86_400_000;
const BASE = new Date('2026-01-01T00:00:00.000Z');

function fecha(dias: number): Date {
  return new Date(BASE.getTime() + dias * MS_DIA);
}

describe('reglas de reto', () => {
  describe('finDelDia', () => {
    it('lleva el limite a las 23:59:59.999 del mismo dia', () => {
      const limite = finDelDia(new Date(2026, 9, 20, 0, 0, 0, 0));

      expect(limite.getFullYear()).toBe(2026);
      expect(limite.getMonth()).toBe(9);
      expect(limite.getDate()).toBe(20);
      expect(limite.getHours()).toBe(23);
      expect(limite.getMinutes()).toBe(59);
      expect(limite.getSeconds()).toBe(59);
      expect(limite.getMilliseconds()).toBe(999);
    });

    it('el reto sigue vigente durante todo el dia indicado', () => {
      const limite = finDelDia(new Date(2026, 9, 20, 10, 30, 0, 0));
      // Mediodia y ultimo minuto del dia limite: aun no vencido.
      expect(limite.getTime()).toBeGreaterThan(new Date(2026, 9, 20, 12, 0, 0, 0).getTime());
      expect(limite.getTime()).toBeGreaterThan(new Date(2026, 9, 20, 23, 59, 0, 0).getTime());
      // Primer instante del dia siguiente: vencido.
      expect(limite.getTime()).toBeLessThan(new Date(2026, 9, 21, 0, 0, 0, 0).getTime());
    });

    it('no muta la fecha original', () => {
      const original = new Date(2026, 9, 20, 8, 0, 0, 0);
      finDelDia(original);

      expect(original.getHours()).toBe(8);
    });
  });

  describe('calcularDiasEstimados', () => {
    it('cuenta los dias continuos hasta la fecha limite', () => {
      expect(calcularDiasEstimados(BASE, fecha(5))).toBe(5);
      expect(calcularDiasEstimados(BASE, fecha(30))).toBe(30);
    });

    it('nunca devuelve negativo', () => {
      expect(calcularDiasEstimados(BASE, fecha(-10))).toBe(0);
    });
  });

  describe('calcularDificultad', () => {
    it('facil hasta 50 dias', () => {
      expect(calcularDificultad(5)).toBe(Dificultad.Facil);
      expect(calcularDificultad(50)).toBe(Dificultad.Facil);
    });

    it('medio de 51 a 150 dias', () => {
      expect(calcularDificultad(51)).toBe(Dificultad.Medio);
      expect(calcularDificultad(150)).toBe(Dificultad.Medio);
    });

    it('dificil de 151 a 300 dias', () => {
      expect(calcularDificultad(151)).toBe(Dificultad.Dificil);
      expect(calcularDificultad(300)).toBe(Dificultad.Dificil);
    });
  });

  describe('calcularPuntosCompletado', () => {
    it('facil: 5 puntos por cada 5 dias con tope 50', () => {
      expect(calcularPuntosCompletado(5)).toBe(5);
      expect(calcularPuntosCompletado(10)).toBe(10);
      expect(calcularPuntosCompletado(25)).toBe(25);
      expect(calcularPuntosCompletado(50)).toBe(50);
    });

    it('medio: base 50 y 50 puntos mas por cada 50 dias adicionales, tope 150', () => {
      expect(calcularPuntosCompletado(51)).toBe(50);
      expect(calcularPuntosCompletado(100)).toBe(100);
      expect(calcularPuntosCompletado(150)).toBe(150);
    });

    it('dificil: base 150 y 50 puntos mas por cada 50 dias adicionales, tope 300', () => {
      expect(calcularPuntosCompletado(151)).toBe(150);
      expect(calcularPuntosCompletado(200)).toBe(200);
      expect(calcularPuntosCompletado(300)).toBe(300);
    });

    it('nunca supera el tope de cada dificultad', () => {
      expect(calcularPuntosCompletado(300, Dificultad.Facil)).toBe(50);
      expect(calcularPuntosCompletado(300, Dificultad.Medio)).toBe(150);
    });
  });

  describe('calcularPuntosParticipar', () => {
    it('es el 25 por ciento de los puntos de cumplimiento', () => {
      expect(calcularPuntosParticipar(50)).toBe(13);
      expect(calcularPuntosParticipar(150)).toBe(38);
    });
  });

  describe('factorPorEvidencias', () => {
    it('paga 0 sin evidencias aprobadas', () => {
      expect(factorPorEvidencias(0, 5)).toBe(0);
      expect(factorPorEvidencias(0, 1)).toBe(0);
    });

    it('paga 25% con menos de la mitad de los dias requeridos', () => {
      expect(factorPorEvidencias(1, 5)).toBe(0.25);
      expect(factorPorEvidencias(2, 5)).toBe(0.25);
      expect(factorPorEvidencias(1, 9)).toBe(0.25);
    });

    it('paga 50% con la mitad o mas pero menos del 75%', () => {
      expect(factorPorEvidencias(3, 5)).toBe(0.5);
      expect(factorPorEvidencias(6, 9)).toBe(0.5);
      expect(factorPorEvidencias(2, 4)).toBe(0.5);
    });

    it('paga 75% con el 75% o mas pero sin completar todos los dias', () => {
      expect(factorPorEvidencias(4, 5)).toBe(0.75);
      expect(factorPorEvidencias(7, 9)).toBe(0.75);
      expect(factorPorEvidencias(3, 4)).toBe(0.75);
    });

    it('paga 100% al completar todos los dias requeridos', () => {
      expect(factorPorEvidencias(5, 5)).toBe(1);
      expect(factorPorEvidencias(9, 9)).toBe(1);
    });

    it('nunca pasa del 100% aunque haya evidencias de mas', () => {
      expect(factorPorEvidencias(6, 5)).toBe(1);
      expect(factorPorEvidencias(12, 9)).toBe(1);
    });

    it('con dias requeridos invalidos y evidencias aprobadas paga el total', () => {
      expect(factorPorEvidencias(1, 0)).toBe(1);
    });
  });

  describe('calcularNivel', () => {
    it('nivel 0 con un reto cumplido', () => {
      expect(calcularNivel(0)).toBe(0);
      expect(calcularNivel(1)).toBe(0);
    });

    it('duplica el reto requerido en cada nivel', () => {
      expect(calcularNivel(2)).toBe(1);
      expect(calcularNivel(3)).toBe(1);
      expect(calcularNivel(4)).toBe(2);
      expect(calcularNivel(8)).toBe(3);
      expect(calcularNivel(16)).toBe(4);
    });

    it('tiene tope en el nivel 100', () => {
      expect(calcularNivel(2 ** 120)).toBe(100);
    });

    it('retosRequeridosParaNivel duplica en cada nivel', () => {
      expect(retosRequeridosParaNivel(0)).toBe(1);
      expect(retosRequeridosParaNivel(1)).toBe(2);
      expect(retosRequeridosParaNivel(4)).toBe(16);
    });
  });
});
