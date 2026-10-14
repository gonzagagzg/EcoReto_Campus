import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');
const rutaEnv = join(raiz, '.env');
const carpetaEntornos = join(raiz, 'src', 'environments');
const rutaEnvironment = join(carpetaEntornos, 'environment.ts');
// Config runtime: se sirve tal cual en /config.json y se puede editar
// despues de `ng build` sin recompilar (ver ConfigService).
const rutaConfigJson = join(raiz, 'public', 'config.json');

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
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
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

/** Normaliza un host a URL base del backend:
 *  - Con esquema (https://dominio.com): se usa tal cual, opcionalmente con
 *    puerto (tambien puede ir dentro de la URL).
 *  - Sin esquema (host o IP de LAN): se arma http://<host>:<puerto>. */
function normalizarBackendUrl(bruto, puerto) {
  const limpio = String(bruto).trim().replace(/\/+$/, '');

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(limpio)) {
    if (puerto.length > 0 && !/:\d+$/.test(limpio)) {
      return `${limpio}:${puerto}`;
    }
    return limpio;
  }

  // Sin esquema: host o IP de LAN, con puerto inline opcional.
  if (/:\d+$/.test(limpio) || puerto.length === 0) {
    return `http://${limpio}`;
  }

  return `http://${limpio}:${puerto}`;
}

/** Construye la URL base del backend segun BACKEND_HOST (+ BACKEND_PORT). */
function construirBackendUrl(vars) {
  const bruto = obtener(vars, 'BACKEND_HOST');
  const puerto = (vars.BACKEND_PORT ?? '').trim();

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(bruto.trim()) && puerto.length === 0) {
    throw new Error('BACKEND_PORT requerido cuando BACKEND_HOST no trae esquema (host/IP de LAN).');
  }

  return normalizarBackendUrl(bruto, puerto);
}

/** Lista ordenada de backends para failover: el principal primero y luego
 *  cada URL de BACKENDS (coma-separadas, con o sin esquema). */
function construirBackends(vars, backendPrincipal) {
  const puerto = (vars.BACKEND_PORT ?? '').trim();
  const crudo = (vars.BACKENDS ?? '').trim();
  const lista = [backendPrincipal];

  if (!crudo) {
    return lista;
  }

  for (const parte of crudo.split(',')) {
    if (!parte.trim()) {
      continue;
    }
    const url = normalizarBackendUrl(parte, puerto);
    if (!lista.includes(url)) {
      lista.push(url);
    }
  }

  return lista;
}

function main() {
  const vars = leerEnv(rutaEnv);

  if (!existsSync(rutaEnv)) {
    console.log(`No se encontro ${rutaEnv}, se usan los valores por defecto.`);
  }

  const backendHost = obtener(vars, 'BACKEND_HOST');
  const backendPort = (vars.BACKEND_PORT ?? '').trim();
  const apiPrefix = obtener(vars, 'API_PREFIX');
  const uploadsPrefix = obtener(vars, 'UPLOADS_PREFIX');

  const rutaApi = `/${limpiarRuta(apiPrefix)}`;
  const rutaSubidas = `/${limpiarRuta(uploadsPrefix)}`;

  const backendUrl = construirBackendUrl(vars);
  // URL absoluta: el navegador llama al backend directamente, sin proxy.
  const apiUrl = `${backendUrl}${rutaApi}`;
  const uploadsUrl = `${backendUrl}${rutaSubidas}`;

  const contenido = `// ARCHIVO GENERADO AUTOMATICAMENTE por scripts/load-env.mjs
// No editar a mano: cambia el valor en frontend/.env y vuelve a ejecutar
// 'npm start' o 'npm run build'.
// Estos valores son solo el respaldo compilado; en runtime ConfigService
// los reemplaza con lo que traiga public/config.json (o dist/.../config.json).

export const environment = {
  apiUrl: '${escapar(apiUrl)}',
  uploadsUrl: '${escapar(uploadsUrl)}',
  backendUrl: '${escapar(backendUrl)}',
};
`;

  mkdirSync(carpetaEntornos, { recursive: true });
  writeFileSync(rutaEnvironment, contenido, 'utf8');

  // Config runtime editable sin recompilar: mismo contenido + variables crudas
  // para poder cambiar solo BACKEND_HOST en el servidor desplegado.
  // `backends` es la lista ordenada para failover (principal primero).
  const configJson = {
    backendUrl,
    apiUrl,
    uploadsUrl,
    BACKEND_HOST: backendHost,
    BACKEND_PORT: backendPort,
    API_PREFIX: apiPrefix,
    UPLOADS_PREFIX: uploadsPrefix,
    backends: construirBackends(vars, backendUrl),
  };
  writeFileSync(rutaConfigJson, `${JSON.stringify(configJson, null, 2)}\n`, 'utf8');

  console.log(`API_URL=${apiUrl}`);
  console.log(`UPLOADS_URL=${uploadsUrl}`);
  console.log(`BACKENDS=${configJson.backends.join(',')}`);
  console.log(`CONFIG_JSON=${rutaConfigJson}`);
}

main();
