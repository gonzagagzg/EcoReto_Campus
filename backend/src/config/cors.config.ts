/**
 * Configuración CORS para la API.
 *
 * Orígenes leídos de CORS_ORIGINS del backend/.env, separados por coma.
 * - Si la lista incluye "*", la API refleja el origen de cada petición
 *   (origin: true), de modo que cualquier dispositivo de la red local pueda
 *   conectar con credenciales/cookies.
 * - Sin "*", solo se permiten los orígenes listados explícitamente.
 */

type OpcionOrigen = true | string[];

/**
 * Quita espacios, elimina la barra final, filtra vacios y elimina duplicados
 * conservando el orden. El header Origin del navegador nunca lleva barra final.
 */
function limpiar(origenes: string[]): string[] {
  return [
    ...new Set(
      origenes
        .map((origen) => origen.trim().replace(/\/+$/, ''))
        .filter((origen) => origen.length > 0),
    ),
  ];
}

export function corsConfig(): { origin: OpcionOrigen; credentials: true } {
  const origenes = limpiar((process.env.CORS_ORIGINS ?? '').split(','));
  const abierto = origenes.includes('*');

  return { origin: abierto ? true : origenes, credentials: true };
}
