import { mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

/** Rutas y nombres de archivo normalizados de los modulos con imagen. */
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;

export const EXTENSIONES_IMAGEN = ['.jpg', '.jpeg', '.png', '.webp'];

export function uploadsRoot(): string {
  const configurado = process.env.UPLOADS_DIR ?? 'uploads';
  return isAbsolute(configurado) ? configurado : resolve(process.cwd(), configurado);
}

export function buildRetoDir(idReto: number): string {
  return join(uploadsRoot(), 'Imagenesretos', 'Retos', String(idReto));
}

export function buildEvidenciaDir(
  idReto: number,
  idRetosParticipantes: number,
  idParticipacion: number,
  idUsuario: number,
): string {
  return join(
    uploadsRoot(),
    'evidencias',
    buildEvidenciaPrefijo(idReto, idRetosParticipantes, idParticipacion, idUsuario),
  );
}

export function buildSoporteDir(idSoporte: number): string {
  return join(uploadsRoot(), 'soporte', String(idSoporte));
}

export function buildUsuarioDir(idUsuario: number): string {
  return join(uploadsRoot(), 'usuarios', 'Fotos_perfil_usuario', String(idUsuario));
}

export function ensureUploadDir(path: string): string {
  mkdirSync(path, { recursive: true });
  return path;
}

export function buildRetoNombreArchivo(idReto: number): string {
  return `${idReto}_imagen.jpg`;
}

/**
 * Las rutas relativas se guardan en BD y el frontend las concatena a una URL:
 * siempre con `/`, incluso en Windows donde `join` usa `\` (si no, la imagen
 * no carga en desarrollo local).
 */
function aUrlRelativa(ruta: string): string {
  return ruta.replace(/\\/g, '/');
}

/** Ruta relativa para guardar en BD: Imagenesretos/Retos/{idReto}/{idReto}_imagen.jpg */
export function buildRetoPathRelativo(idReto: number): string {
  return aUrlRelativa(join('Imagenesretos', 'Retos', String(idReto), buildRetoNombreArchivo(idReto)));
}

export function buildEvidenciaPrefijo(
  idReto: number,
  idRetosParticipantes: number,
  idParticipacion: number,
  idUsuario: number,
): string {
  return `${idReto}_${idRetosParticipantes}_${idParticipacion}_${idUsuario}`;
}

export function buildEvidenciaNombreArchivo(prefijo: string, secuencial: number): string {
  return `${prefijo}_${secuencial}.jpg`;
}

export function buildEvidenciaPathRelativo(prefijo: string, secuencial: number): string {
  return aUrlRelativa(join('evidencias', prefijo, buildEvidenciaNombreArchivo(prefijo, secuencial)));
}

export function buildSoporteNombreArchivo(idSoporte: number, secuencial: number): string {
  return `${idSoporte}_soporte_${secuencial}.jpg`;
}

export function buildSoportePathRelativo(idSoporte: number, secuencial: number): string {
  return aUrlRelativa(join('soporte', String(idSoporte), buildSoporteNombreArchivo(idSoporte, secuencial)));
}

/**
 * Nombre del avatar. La `version` cambia en cada subida para que la URL sea
 * distinta y el navegador no sirva la imagen vieja desde su cache.
 */
export function buildUsuarioNombreArchivo(idUsuario: number, version: number): string {
  return `${idUsuario}_fotoperfil_${version}.jpg`;
}

export function buildUsuarioPathRelativo(idUsuario: number, version: number): string {
  return aUrlRelativa(
    join('usuarios', 'Fotos_perfil_usuario', String(idUsuario), buildUsuarioNombreArchivo(idUsuario, version)),
  );
}

/** Carpeta de imágenes de premios: uploads/premios/{idPremio}/ */
export function buildPremioDir(idPremio: number): string {
  return join(uploadsRoot(), 'premios', String(idPremio));
}

/** Nombre de archivo del premio: {idPremio}.jpg (siempre jpg para consistencia). */
export function buildPremioNombreArchivo(idPremio: number): string {
  return `${idPremio}.jpg`;
}

/** Ruta relativa para guardar en BD: premios/{idPremio}/{idPremio}.jpg */
export function buildPremioPathRelativo(idPremio: number): string {
  return aUrlRelativa(join('premios', String(idPremio), buildPremioNombreArchivo(idPremio)));
}

/** Carpeta de imágenes de gustos: uploads/gustos/{idGusto}/ */
export function buildGustoDir(idGusto: number): string {
  return join(uploadsRoot(), 'gustos', String(idGusto));
}

/** Nombre de archivo del gusto: {idGusto}.jpg (siempre jpg para consistencia). */
export function buildGustoNombreArchivo(idGusto: number): string {
  return `${idGusto}.jpg`;
}

/** Ruta relativa para guardar en BD: gustos/{idGusto}/{idGusto}.jpg */
export function buildGustoPathRelativo(idGusto: number): string {
  return aUrlRelativa(join('gustos', String(idGusto), buildGustoNombreArchivo(idGusto)));
}

/** Borra una carpeta de archivos. No falla si ya no existe. */
export async function eliminarCarpeta(path: string): Promise<boolean> {
  try {
    await rm(path, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Una carpeta solo puede borrarse si esta estrictamente dentro de uploadsRoot:
 * nunca la raiz misma ni rutas que escapen (`../`) o absolutas fuera de ella.
 * Protege contra valores inesperados en BD (ej: un nombre de archivo sin
 * subcarpeta, cuyo dirname es '.', que de otro modo apuntaria a toda la raiz).
 */
export function esCarpetaBorradoSegura(path: string): boolean {
  const raiz = uploadsRoot();
  const relativo = relative(raiz, resolve(path));

  return relativo.length > 0 && !relativo.startsWith('..') && !isAbsolute(relativo);
}

export function esExtensionImagen(nombreArchivo: string): boolean {
  const punto = nombreArchivo.lastIndexOf('.');
  const extension = punto === -1 ? '' : nombreArchivo.slice(punto).toLowerCase();
  return EXTENSIONES_IMAGEN.includes(extension);
}
