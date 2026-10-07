import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');
const rutaEnv = join(raiz, '.env');
const carpetaEntornos = join(raiz, 'src', 'environments');
const rutaEnvironment = join(carpetaEntornos, 'environment.ts');

/** Lee un archivo .env en formato clave=valor, ignorando comentarios. */
function leerEnv(ruta) {
  const vars = {};

  if (!existsSync(ruta)) {
    return vars;
  }

  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();

    if (!limpia || limpia.startsWith('#')) {
      continue;
    }

    const separador = limpia.indexOf('=');
    if (separador === -1) {
      continue;
    }

    const clave = limpia.slice(0, separador).trim();
    let valor = limpia.slice(separador + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    vars[clave] = valor;
  }

  return vars;
}

/** Escapa una cadena para poder ir dentro de un literal de TypeScript. */
function escapar(valor) {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/** Quita barras sobrantes al inicio y al final: '/gg/' -> 'gg'. */
function limpiarRuta(valor) {
  return String(valor).replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Solo usa variables del .env (sin defaults, sin process.env). */
function obtener(vars, clave) {
  const valor = vars[clave];
  if (valor === undefined) {
    throw new Error(`Variable requerida no encontrada en .env: ${clave}`);
  }
  return valor;
}

function main() {
  const vars = leerEnv(rutaEnv);

  if (!existsSync(rutaEnv)) {
    console.log(`No se encontro ${rutaEnv}, se usan los valores por defecto.`);
  }

  const host = obtener(vars, 'BACKEND_HOST');
  const puerto = obtener(vars, 'BACKEND_PORT');
  const rutaApi = `/${limpiarRuta(obtener(vars, 'API_PREFIX'))}`;
  const rutaSubidas = `/${limpiarRuta(obtener(vars, 'UPLOADS_PREFIX'))}`;

  const backendUrl = `http://${host}:${puerto}`;
  // URL absoluta: el navegador llama al backend directamente, sin proxy.
  const apiUrl = `${backendUrl}${rutaApi}`;
  const uploadsUrl = `${backendUrl}${rutaSubidas}`;

  const contenido = `// ARCHIVO GENERADO AUTOMATICAMENTE por scripts/load-env.mjs
// No editar a mano: cambia el valor en frontend/.env y vuelve a ejecutar
// 'npm start' o 'npm run build'.

export const environment = {
  apiUrl: '${escapar(apiUrl)}',
  uploadsUrl: '${escapar(uploadsUrl)}',
  backendUrl: '${escapar(backendUrl)}',
};
`;

  mkdirSync(carpetaEntornos, { recursive: true });
  writeFileSync(rutaEnvironment, contenido, 'utf8');

  console.log(`API_URL=${apiUrl}`);
  console.log(`UPLOADS_URL=${uploadsUrl}`);
}

main();
