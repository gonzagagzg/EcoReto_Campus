import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    // ConfigService sin load(): usa el respaldo compilado (environment.ts).
    baseUrl = TestBed.inject(ConfigService).apiUrl;
  });

  afterEach(() => {
    http.verify();
  });

  it('prefija la url base al pedir un recurso', () => {
    api.get('retos').subscribe();

    const req = http.expectOne(`${baseUrl}/retos`);
    expect(req.request.method).toBe('GET');
  });

  it('descarta los parametros vacios o indefinidos', () => {
    api
      .get('retos', {
        busqueda: 'playa',
        pagina: 2,
        estadoReto: undefined,
        categoria: '',
      })
      .subscribe();

    const req = http.expectOne(`${baseUrl}/retos?busqueda=playa&pagina=2`);
    expect(req.request.params.keys()).toEqual(['busqueda', 'pagina']);
  });

  it('agrupa rutas anidadas bajo el prefijo sin barras dobles', () => {
    api.get('usuarios/4/gustos').subscribe();

    http.expectOne(`${baseUrl}/usuarios/4/gustos`);
  });

  it('permite pedir la raiz del prefijo', () => {
    api.get('').subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.params.keys()).toEqual([]);
  });

  it('envia el cuerpo tal cual en un post', () => {
    const cuerpo = { nombreReto: 'Recicla' };

    api.post('retos', cuerpo).subscribe();

    const req = http.expectOne(`${baseUrl}/retos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
  });
});
