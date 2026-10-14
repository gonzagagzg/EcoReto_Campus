import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET) devuelve el estado de conexion con la base de datos', async () => {
    const respuesta = await request(app.getHttpServer()).get('/').expect(200);

    expect(respuesta.body.conectado).toBe(true);
    expect(respuesta.body.mensaje).toBe('ok');
    expect(typeof respuesta.body.ia).toBe('boolean');
  });

  afterEach(async () => {
    await app.close();
  });
});
