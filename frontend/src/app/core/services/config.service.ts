import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Forma del archivo `config.json` servido junto a la app (`public/config.json`
 * en desarrollo, `dist/frontend/browser/config.json` en produccion).
 *
 * Se genera con los mismos valores del `.env` en cada `npm start`/`build`,
 * pero a diferencia de `environment.ts` se puede editar DESPUES de compilar
 * sin recompilar: basta cambiar el archivo y recargar el navegador.
 *
 * Si trae `BACKEND_HOST` se recalculan las URLs desde las variables crudas
 * (asi solo hay que editar un campo); si no, se usan las URLs ya calculadas.
 *
 * `backends` es la lista ordenada para failover automatico (principal
 * primero): al arrancar se prueba cada uno con el endpoint de salud
 * (`GET {backend}/{API_PREFIX}`) y se usa el primero que responda.
 */
export interface RuntimeConfig {
  backendUrl?: string;
  apiUrl?: string;
  uploadsUrl?: string;
  BACKEND_HOST?: string;
  BACKEND_PORT?: string;
  API_PREFIX?: string;
  UPLOADS_PREFIX?: string;
  backends?: string[];
}

/** Quita barras al inicio/final: '/gg/' -> 'gg'. */
function limpiarRuta(valor: string): string {
  return String(valor).replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Replica la logica de `scripts/load-env.mjs`:
 * - Con esquema (https://dominio.com): se usa tal cual (+ BACKEND_PORT opcional).
 * - Sin esquema (host/IP de LAN): se arma http://host:puerto.
 */
function construirBackendUrl(host: string, port: string): string {
  const bruto = host.replace(/\/+$/, '');

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(bruto)) {
    return `http://${bruto}:${port}`;
  }

  if (port.length > 0 && !/:\d+$/.test(bruto)) {
    return `${bruto}:${port}`;
  }

  return bruto;
}

/** Timeout del health-check por candidato en failover (ms). */
const SALUD_TIMEOUT_MS = 4000;

/** GET con timeout manual (evita depender de AbortSignal.timeout del lib). */
async function fetchConTimeout(url: string, ms: number): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ms);

  try {
    return await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controlador.signal,
    });
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Configuracion efectiva de la app. Los valores iniciales son el respaldo
 * compilado (`environment.ts`) y `load()` los reemplaza con `config.json`.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private _backendUrl = environment.backendUrl;
  private _apiUrl = environment.apiUrl;
  private _uploadsUrl = environment.uploadsUrl;
  private _apiPrefijo = 'gg';
  private _subidasPrefijo = 'uploads';
  private _candidatos: string[] = [environment.backendUrl];
  private _indice = 0;

  get backendUrl(): string {
    return this._backendUrl;
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get uploadsUrl(): string {
    return this._uploadsUrl;
  }

  /** Candidatos ordenados para failover (principal primero). */
  get backends(): string[] {
    return [...this._candidatos];
  }

  /**
   * Carga `config.json` antes del bootstrap (ver `APP_INITIALIZER` en
   * `app.config.ts`). Nunca rechaza: si el archivo falta o es invalido se
   * conservan los valores compilados y la app arranca igual.
   */
  async load(): Promise<void> {
    // Ruta relativa a proposito: funciona con base-href "/" en web y con
    // el esquema file:// de Capacitor. '/config.json' con barra inicial
    // romperia despliegues en subruta y la app movil.
    const candidatos = ['config.json', './config.json'];

    for (const url of candidatos) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          continue;
        }

        this.aplicar((await res.json()) as RuntimeConfig);
        await this.elegirBackendSano();
        return;
      } catch {
        // Intenta el siguiente candidato.
      }
    }

    console.warn('[config] no se pudo cargar config.json, se usan los valores compilados.');
  }

  /**
   * Rota al siguiente candidato y devuelve su `apiUrl`. Lo usa el interceptor
   * de failover para reintentar GETs. Con un solo backend devuelve `null`.
   */
  siguienteBackend(): string | null {
    if (this._candidatos.length < 2) {
      return null;
    }

    this._indice = (this._indice + 1) % this._candidatos.length;
    this.fijarBackend(this._candidatos[this._indice]);

    return this._apiUrl;
  }

  private aplicar(json: RuntimeConfig): void {
    if (!json || typeof json !== 'object') {
      return;
    }

    const hostCrudo = (json.BACKEND_HOST ?? '').trim();

    if (hostCrudo.length > 0) {
      const puerto = (json.BACKEND_PORT ?? '').trim();
      this._apiPrefijo = limpiarRuta(json.API_PREFIX ?? 'gg') || 'gg';
      this._subidasPrefijo = limpiarRuta(json.UPLOADS_PREFIX ?? 'uploads') || 'uploads';
      this.fijarBackend(construirBackendUrl(hostCrudo, puerto));
    } else {
      if (typeof json.backendUrl === 'string' && json.backendUrl.trim()) {
        this._backendUrl = json.backendUrl.replace(/\/+$/, '');
      }
      if (typeof json.apiUrl === 'string' && json.apiUrl.trim()) {
        this._apiUrl = json.apiUrl.replace(/\/+$/, '');
      }
      if (typeof json.uploadsUrl === 'string' && json.uploadsUrl.trim()) {
        this._uploadsUrl = json.uploadsUrl.replace(/\/+$/, '');
      }
      // Deriva los prefijos de las URLs directas para el health-check y
      // la rotacion (ej: apiUrl 'https://h/custom' -> prefijo 'custom').
      if (this._apiUrl.startsWith(this._backendUrl)) {
        this._apiPrefijo =
          limpiarRuta(this._apiUrl.slice(this._backendUrl.length)) || this._apiPrefijo;
      }
      if (this._uploadsUrl.startsWith(this._backendUrl)) {
        this._subidasPrefijo =
          limpiarRuta(this._uploadsUrl.slice(this._backendUrl.length)) || this._subidasPrefijo;
      }
    }

    this._candidatos = this.sanitizarBackends(this._backendUrl, json.backends);
    this._indice = 0;
  }

  /** Fija las 3 URLs a partir de un backend base y los prefijos vigentes. */
  private fijarBackend(backend: string): void {
    const base = backend.replace(/\/+$/, '');

    this._backendUrl = base;
    this._apiUrl = `${base}/${this._apiPrefijo}`;
    this._uploadsUrl = `${base}/${this._subidasPrefijo}`;
  }

  /** Principal primero + respaldo, sin vacios ni duplicados. */
  private sanitizarBackends(principal: string, lista?: string[]): string[] {
    const candidatos = [principal.replace(/\/+$/, '')];

    if (Array.isArray(lista)) {
      for (const item of lista) {
        if (typeof item !== 'string') {
          continue;
        }
        const url = item.trim().replace(/\/+$/, '');
        if (url && !candidatos.includes(url)) {
          candidatos.push(url);
        }
      }
    }

    return candidatos;
  }

  /**
   * Prueba cada candidato con el endpoint de salud y deja activo el primero
   * que responda 2xx. Con un solo candidato no hace ninguna peticion. Si
   * ninguno responde se conserva el principal y la app arranca igual.
   */
  private async elegirBackendSano(): Promise<void> {
    if (this._candidatos.length < 2) {
      return;
    }

    for (let i = 0; i < this._candidatos.length; i++) {
      try {
        const res = await fetchConTimeout(
          `${this._candidatos[i]}/${this._apiPrefijo}`,
          SALUD_TIMEOUT_MS,
        );

        if (res.ok) {
          this._indice = i;
          this.fijarBackend(this._candidatos[i]);

          if (i > 0) {
            console.info(
              `[config] backend principal caido, usando respaldo: ${this._candidatos[i]}`,
            );
          }
          return;
        }
      } catch {
        // Prueba el siguiente candidato.
      }
    }

    console.warn('[config] ningun backend respondio, se conserva el principal.');
  }
}
