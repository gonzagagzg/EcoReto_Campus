import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { environment } from '../../../environments/environment';

function mockFetchOnce(json: unknown, ok = true): void {
  globalThis.fetch = (async () =>
    ({
      ok,
      json: async () => json,
    }) as Response) as typeof fetch;
}

/** Mock de fetch que responde segun la URL pedida (config.json vs health-checks). */
function mockFetchPorUrl(responder: (url: string) => Promise<Response>): void {
  globalThis.fetch = ((input: string | URL | Request) => responder(String(input))) as typeof fetch;
}

function respuestaJson(json: unknown): Response {
  return {
    ok: true,
    json: async () => json,
  } as Response;
}

describe('ConfigService', () => {
  const fetchOriginal = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  it('usa los valores compilados antes de cargar config.json', () => {
    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);

    expect(config.apiUrl).toBe(environment.apiUrl);
    expect(config.uploadsUrl).toBe(environment.uploadsUrl);
    expect(config.backendUrl).toBe(environment.backendUrl);
  });

  it('aplica las urls calculadas de config.json sin recompilar', async () => {
    mockFetchOnce({
      backendUrl: 'https://api.ecoreto.app',
      apiUrl: 'https://api.ecoreto.app/gg',
      uploadsUrl: 'https://api.ecoreto.app/uploads',
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.apiUrl).toBe('https://api.ecoreto.app/gg');
    expect(config.uploadsUrl).toBe('https://api.ecoreto.app/uploads');
    expect(config.backendUrl).toBe('https://api.ecoreto.app');
  });

  it('recalcula desde BACKEND_HOST con esquema editando un solo campo', async () => {
    mockFetchOnce({
      BACKEND_HOST: 'https://nuevo-backend.example.com/',
      BACKEND_PORT: '',
      API_PREFIX: 'gg',
      UPLOADS_PREFIX: 'uploads',
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backendUrl).toBe('https://nuevo-backend.example.com');
    expect(config.apiUrl).toBe('https://nuevo-backend.example.com/gg');
    expect(config.uploadsUrl).toBe('https://nuevo-backend.example.com/uploads');
  });

  it('recalcula una IP de LAN sin esquema con su puerto', async () => {
    mockFetchOnce({
      BACKEND_HOST: '192.168.1.50',
      BACKEND_PORT: '3000',
      API_PREFIX: 'gg',
      UPLOADS_PREFIX: 'uploads',
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backendUrl).toBe('http://192.168.1.50:3000');
    expect(config.apiUrl).toBe('http://192.168.1.50:3000/gg');
  });

  it('conserva los valores compilados si config.json no existe', async () => {
    globalThis.fetch = (async () => ({ ok: false }) as Response) as typeof fetch;

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.apiUrl).toBe(environment.apiUrl);
  });

  it('expone la lista de backends saneada con el principal primero', async () => {
    mockFetchOnce({
      BACKEND_HOST: 'https://uno.example/',
      BACKEND_PORT: '',
      API_PREFIX: 'gg',
      UPLOADS_PREFIX: 'uploads',
      backends: ['https://uno.example', 'https://dos.example/', '', 'https://uno.example'],
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backends).toEqual(['https://uno.example', 'https://dos.example']);
  });

  it('usa el respaldo al arrancar si el principal no responde', async () => {
    mockFetchPorUrl(async (url) => {
      if (url.includes('config.json')) {
        return respuestaJson({
          BACKEND_HOST: 'https://caido.example',
          BACKEND_PORT: '',
          API_PREFIX: 'gg',
          UPLOADS_PREFIX: 'uploads',
          backends: ['https://caido.example', 'https://respaldo.example'],
        });
      }
      if (url.startsWith('https://caido.example')) {
        throw new Error('red caida');
      }
      return { ok: true } as Response;
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backendUrl).toBe('https://respaldo.example');
    expect(config.apiUrl).toBe('https://respaldo.example/gg');
    expect(config.uploadsUrl).toBe('https://respaldo.example/uploads');
  });

  it('conserva el principal si ningun backend responde', async () => {
    mockFetchPorUrl(async (url) => {
      if (url.includes('config.json')) {
        return respuestaJson({
          BACKEND_HOST: 'https://caido.example',
          BACKEND_PORT: '',
          API_PREFIX: 'gg',
          UPLOADS_PREFIX: 'uploads',
          backends: ['https://caido.example', 'https://otro-caido.example'],
        });
      }
      throw new Error('red caida');
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backendUrl).toBe('https://caido.example');
    expect(config.apiUrl).toBe('https://caido.example/gg');
  });

  it('siguienteBackend rota en orden circular', async () => {
    mockFetchOnce({
      BACKEND_HOST: 'https://uno.example',
      BACKEND_PORT: '',
      API_PREFIX: 'gg',
      UPLOADS_PREFIX: 'uploads',
      backends: ['https://uno.example', 'https://dos.example', 'https://tres.example'],
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.siguienteBackend()).toBe('https://dos.example/gg');
    expect(config.siguienteBackend()).toBe('https://tres.example/gg');
    expect(config.siguienteBackend()).toBe('https://uno.example/gg');
    expect(config.backendUrl).toBe('https://uno.example');
  });

  it('siguienteBackend devuelve null con un solo backend', async () => {
    mockFetchOnce({
      BACKEND_HOST: 'https://unico.example',
      BACKEND_PORT: '',
      API_PREFIX: 'gg',
      UPLOADS_PREFIX: 'uploads',
    });

    TestBed.configureTestingModule({});
    const config = TestBed.inject(ConfigService);
    await config.load();

    expect(config.backends).toEqual(['https://unico.example']);
    expect(config.siguienteBackend()).toBeNull();
  });
});
