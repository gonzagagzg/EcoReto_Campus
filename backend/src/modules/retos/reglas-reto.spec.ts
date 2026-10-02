import { Dificultad } from './entities/reto.entity';
import {
  calcularDiasEstimados,
  calcularDificultad,
  calcularNivel,
  calcularPuntosCompletado,
  calcularPuntosParticipar,
  factorCumplimiento,
  retosRequeridosParaNivel,
} from './reglas-reto';

const MS_DIA = 86_400_000;
const BASE = new Date('2026-01-01T00:00:00.000Z');

function fecha(dias: number): Date {
  return new Date(BASE.getTime() + dias * MS_DIA);
}

describe('reglas de reto', () => {
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

  describe('factorCumplimiento', () => {
    it('paga 100 por ciento con todos los dias cumplidos', () => {
      expect(factorCumplimiento(30, 30)).toBe(1);
      expect(factorCumplimiento(30, 40)).toBe(1);
    });

    it('paga 50 por ciento con al menos la mitad de los dias (2 de cada 4)', () => {
      expect(factorCumplimiento(4, 2)).toBe(0.5);
      expect(factorCumplimiento(4, 3)).toBe(0.5);
    });

    it('paga 0 por ciento por debajo de la mitad', () => {
      expect(factorCumplimiento(4, 1)).toBe(0);
      expect(factorCumplimiento(30, 10)).toBe(0);
    });

    it('sin dias registrados paga el total', () => {
      expect(factorCumplimiento(30, null)).toBe(1);
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
