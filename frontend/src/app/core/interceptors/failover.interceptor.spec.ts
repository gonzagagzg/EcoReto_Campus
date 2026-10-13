import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '../services/api.service';
import { ConfigService } from '../services/config.service';
import { failoverInterceptor } from './failover.interceptor';

const UNO = 'https://uno.example';
const DOS = 'https://dos.example';

async function sembrarDosBackends(): Promise<ConfigService> {
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        backendUrl: UNO,
        apiUrl: `${UNO}/gg`,
        uploadsUrl: `${UNO}/uploads`,
        backends: [UNO, DOS],
      }),
    }) as Response) as typeof fetch;

  const config = TestBed.inject(ConfigService);
  await config.load();

  expect(config.apiUrl).toBe(`${UNO}/gg`);
  return config;
}

describe('failoverInterceptor', () => {
  const fetchOriginal = globalThis.fetch;
  let api: ApiService;
  let http: HttpTestingController;
  let config: ConfigService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([failoverInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    config = await sembrarDosBackends();
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    http.verify();
  });

  it('reintenta un GET en el respaldo ante fallo de red', () => {
    let respuesta: unknown;
    api.get('retos').subscribe((r) => (respuesta = r));

    const primero = http.expectOne(`${UNO}/gg/retos`);
    primero.error(new ProgressEvent('error'));

    const segundo = http.expectOne(`${DOS}/gg/retos`);
    segundo.flush([{ id: 1 }]);

    expect(respuesta).toEqual([{ id: 1 }]);
    expect(config.apiUrl).toBe(`${DOS}/gg`);
  });

  it('reintenta un GET ante error 5xx', () => {
    api.get('retos').subscribe();

    http.expectOne(`${UNO}/gg/retos`).flush({}, { status: 500, statusText: 'Error' });
    http.expectOne(`${DOS}/gg/retos`).flush([]);
  });

  it('no reintenta ante un 404', () => {
    let codigo = 0;
    api.get('retos').subscribe({ error: (e) => (codigo = e.status) });

    http.expectOne(`${UNO}/gg/retos`).flush({}, { status: 404, statusText: 'No existe' });

    expect(codigo).toBe(404);
    expect(config.apiUrl).toBe(`${UNO}/gg`);
  });

  it('no reintenta mutaciones (POST)', () => {
    let fallo = false;
    api.post('retos', { nombreReto: 'x' }).subscribe({ error: () => (fallo = true) });

    http.expectOne(`${UNO}/gg/retos`).error(new ProgressEvent('error'));

    expect(fallo).toBe(true);
    expect(config.apiUrl).toBe(`${UNO}/gg`);
  });

  it('falla tras probar cada respaldo una sola vez', () => {
    let fallo = false;
    api.get('retos').subscribe({ error: () => (fallo = true) });

    http.expectOne(`${UNO}/gg/retos`).error(new ProgressEvent('error'));
    http.expectOne(`${DOS}/gg/retos`).error(new ProgressEvent('error'));

    expect(fallo).toBe(true);
  });
});
