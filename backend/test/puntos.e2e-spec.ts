import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { ParticipacionesDao } from '../src/modules/participaciones/daos/participaciones.dao';
import { ProgresoPuntosService } from '../src/modules/participaciones/services/progreso-puntos.service';
import {
  EstadoEvaluacion,
  Participacion,
} from '../src/modules/participaciones/entities/participacion.entity';
import { Dificultad, EstadoReto, Reto } from '../src/modules/retos/entities/reto.entity';
import { RetoParticipante } from '../src/modules/retos/entities/reto_participante.entity';
import { RetosService } from '../src/modules/retos/services/retos.service';
import { Usuario } from '../src/modules/usuarios/entities/usuario.entity';

jest.setTimeout(60_000);

/**
 * Verificación del modelo de puntos por evidencias aprobadas:
 *
 * - Un reto parcial y ACTIVO no paga nada (los "dias_cumplidos" que digita el
 *   supervisor ya no afectan el pago: solo cuenta el numero de evidencias).
 * - Al llegar a los dias requeridos aprobados: 100% al instante + reto cumplido.
 * - Si niegan una evidencia todo baja al instante (recompuracion total).
 * - Los tramos 25% / 50% / 75% se liquidan al CERRAR el reto (la cron de 4 AM
 *   hace exactamente la misma cuenta que la revision inmediata).
 * - Un reto completado no vuelve a pagar al cerrar.
 *
 * Datos de prueba reales: usuario 7 (UserP1) con 3 de 5 evidencias aprobadas
 * en el reto 7 ('Prueba de puntos': Facil, 5 pts, 5 dias estimados). Se crean
 * dos retos temporales para verificar el tramo 50% al cerrar y el salto de
 * nivel con un segundo reto cumplido. Todo se restaura en afterAll.
 */
const ID_USUARIO = 7;
const ID_RETO_PRUEBA = 7;
/** Inscripciones del usuario 7 al reto 7 que no tienen evidencia todavia. */
const INSCRIPCIONES_LIBRES = [9, 7];
const SUPERVISOR = { correo: 'supervisor@ecoreto.campus', contrasena: 'Prueba1234' };
const MS_DIA = 86_400_000;

interface FilaReporte {
  escenario: string;
  puntos: number;
  historialPuntos: number;
  retosCumplidos: number;
  nivel: number;
}

describe('Puntos por evidencias aprobadas: tramos, cumplido y cierre (e2e)', () => {
  let app: INestApplication<App>;
  let usuariosRepo: Repository<Usuario>;
  let retosRepo: Repository<Reto>;
  let participacionesRepo: Repository<Participacion>;
  let inscripcionesRepo: Repository<RetoParticipante>;
  let dao: ParticipacionesDao;
  let retosService: RetosService;
  let progreso: ProgresoPuntosService;

  let usuarioInicial: Usuario;
  let retoInicial: Reto;
  let tokenSupervisor = '';
  const evidenciasCreadas: number[] = [];
  const inscripcionesCreadas: number[] = [];
  const retosCreados: number[] = [];
  const reporte: FilaReporte[] = [];

  const leerUsuario = () =>
    usuariosRepo.findOneOrFail({ where: { idUsuario: ID_USUARIO } });

  const registrar = async (escenario: string): Promise<void> => {
    const usuario = await leerUsuario();
    reporte.push({
      escenario,
      puntos: usuario.puntos,
      historialPuntos: usuario.historialPuntos,
      retosCumplidos: usuario.retosCumplidos,
      nivel: usuario.nivel,
    });
  };

  const aprobar = async (idParticipacion: number, diasCumplidos?: number): Promise<void> => {
    await request(app.getHttpServer())
      .post(`/supervisor/evidencias/${idParticipacion}/revision`)
      .set('Authorization', `Bearer ${tokenSupervisor}`)
      .send({
        estadoParticipacion: EstadoEvaluacion.Aprobado,
        ...(diasCumplidos === undefined ? {} : { diasCumplidos }),
      })
      .expect(201);
  };

  const negar = async (idParticipacion: number): Promise<void> => {
    await request(app.getHttpServer())
      .post(`/supervisor/evidencias/${idParticipacion}/revision`)
      .set('Authorization', `Bearer ${tokenSupervisor}`)
      .send({
        estadoParticipacion: EstadoEvaluacion.Negado,
        observacionRevision: 'No cumple lo pedido',
      })
      .expect(201);
  };

  const crearEvidencia = async (idRetosParticipantes: number): Promise<number> => {
    const creada = await dao.crear({
      idRetosParticipantes,
      idUsuario: ID_USUARIO,
      imagenEvidencia: '',
      estadoParticipacion: EstadoEvaluacion.Enviado,
    });
    evidenciasCreadas.push(creada.idParticipacion);
    return creada.idParticipacion;
  };

  const crearRetoTemporal = async (
    nombre: string,
    diasEstimados: number,
  ): Promise<number> => {
    const reto = await retosRepo.save({
      idUsuarioCreador: ID_USUARIO,
      nombreReto: nombre,
      descripcionReto: 'Reto creado por el test de puntos',
      categoria: 'Pruebas',
      fechaLimite: new Date(Date.now() + diasEstimados * MS_DIA - 60_000),
      dificultad: Dificultad.Facil,
      puntosCompletado: 5,
      puntosParticipar: 1,
      estadoReto: EstadoReto.Activo,
    });
    retosCreados.push(reto.idReto);
    return reto.idReto;
  };

  const inscribir = async (idReto: number): Promise<number> => {
    const inscripcion = await retosService.registrarParticipacion(idReto, ID_USUARIO);
    inscripcionesCreadas.push(inscripcion.idRetosParticipantes);
    return inscripcion.idRetosParticipantes;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usuariosRepo = app.get(getRepositoryToken(Usuario));
    retosRepo = app.get(getRepositoryToken(Reto));
    participacionesRepo = app.get(getRepositoryToken(Participacion));
    inscripcionesRepo = app.get(getRepositoryToken(RetoParticipante));
    dao = app.get(ParticipacionesDao);
    retosService = app.get(RetosService);
    progreso = app.get(ProgresoPuntosService);

    usuarioInicial = await leerUsuario();
    retoInicial = await retosRepo.findOneOrFail({ where: { idReto: ID_RETO_PRUEBA } });

    for (const idInscripcion of INSCRIPCIONES_LIBRES) {
      await crearEvidencia(idInscripcion);
    }

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(SUPERVISOR)
      .expect(200);
    tokenSupervisor = login.body.accessToken as string;
  });

  it('el recalculo rectifica el modelo viejo: 3 pts pagados por factor de dias pasan a 0', async () => {
    const resultado = await progreso.recalcularUsuario(ID_USUARIO);
    const usuario = await leerUsuario();

    // 3 de 5 evidencias en un reto ACTIVO e incompleto: aun no se paga nada.
    expect(resultado).toEqual({ puntos: 0, historialPuntos: 0, retosCumplidos: 0, nivel: 0 });
    expect(usuario).toMatchObject({
      puntos: 0,
      historialPuntos: 0,
      retosCumplidos: 0,
      nivel: 0,
    });
    await registrar('1. Recalculo: parcial en reto activo no paga (3 -> 0)');
  });

  it('aprobar la 4ta evidencia (aunque el supervisor digite 5 dias) sigue sin pagar', async () => {
    await aprobar(evidenciasCreadas[0], 5);

    const usuario = await leerUsuario();
    // 4/5 = 75%, pero el reto sigue abierto: el tramo se liquida al cerrar.
    expect(usuario).toMatchObject({
      puntos: 0,
      historialPuntos: 0,
      retosCumplidos: 0,
      nivel: 0,
    });
    await registrar('2. 4/5 evidencias en reto activo: 0 pts');
  });

  it('al aprobar la 5ta evidencia (5/5) paga 100% al instante y marca el reto cumplido', async () => {
    await aprobar(evidenciasCreadas[1], 3);

    const usuario = await leerUsuario();
    expect(usuario).toMatchObject({
      puntos: 5,
      historialPuntos: 5,
      retosCumplidos: 1,
      nivel: 0,
    });
    await registrar('3. 5/5 evidencias: +5 instantaneos y reto cumplido');
  });

  it('negar una evidencia aprobada baja los puntos al instante y quita el cumplido', async () => {
    await negar(evidenciasCreadas[1]);

    const usuario = await leerUsuario();
    // Vuelve a 4/5 en reto activo: no solo baja el pago, desaparece del todo.
    expect(usuario).toMatchObject({
      puntos: 0,
      historialPuntos: 0,
      retosCumplidos: 0,
      nivel: 0,
    });
    await registrar('4. Niegan la 5ta evidencia: baja a 0 y quita cumplido');
  });

  it('reaprobar la evidencia vuelve a pagar el 100% al instante', async () => {
    await aprobar(evidenciasCreadas[1], 5);

    const usuario = await leerUsuario();
    expect(usuario).toMatchObject({
      puntos: 5,
      historialPuntos: 5,
      retosCumplidos: 1,
      nivel: 0,
    });
    await registrar('5. Reaprueban la 5ta: otra vez 5 pts y cumplido');
  });

  it('un segundo reto parcial y activo tampoco paga nada mientras el primero aporta 5', async () => {
    const idReto = await crearRetoTemporal('Reto temporal T (50% al cerrar)', 5);
    const inscripcion = await inscribir(idReto);

    for (let i = 0; i < 3; i += 1) {
      const evidencia = await crearEvidencia(inscripcion);
      await aprobar(evidencia, i + 1);
    }

    const usuario = await leerUsuario();
    // reto 7 sigue completo (5) + reto T con 3/5 activo (0).
    expect(usuario).toMatchObject({
      puntos: 5,
      historialPuntos: 5,
      retosCumplidos: 1,
      nivel: 0,
    });
    await registrar('6. Reto T con 3/5 activo: no paga, sigue en 5');
  });

  it('al finalizar el reto T se liquida el tramo del 50% (3/5 evidencias)', async () => {
    const idReto = retosCreados[0];
    await request(app.getHttpServer())
      .post(`/supervisor/retos/${idReto}/decision`)
      .set('Authorization', `Bearer ${tokenSupervisor}`)
      .send({ estadoReto: EstadoReto.Finalizado })
      .expect(201);

    const resultado = await progreso.recalcularUsuario(ID_USUARIO);
    const usuario = await leerUsuario();

    // reto 7 (5/5, 100%) + reto T cerrado (3/5 -> 50% de 5 = 3) = 8.
    // El reto T incompleto NO cuenta como cumplido: nivel sigue en 0.
    expect(resultado).toMatchObject({ puntos: 8, historialPuntos: 8, nivel: 0 });
    expect(usuario).toMatchObject({
      puntos: 8,
      historialPuntos: 8,
      retosCumplidos: 1,
      nivel: 0,
    });
    await registrar('7. Cierre de T: tramo 50% = +3 (total 8)');
  });

  it('completar un segundo reto (1/1) al instante sube el nivel a 1', async () => {
    const idReto = await crearRetoTemporal('Reto temporal U (nivel)', 1);
    const inscripcion = await inscribir(idReto);
    const evidencia = await crearEvidencia(inscripcion);
    await aprobar(evidencia, 1);

    const usuario = await leerUsuario();
    // reto 7 (5) + T cerrado (3) + U 1/1 completado (5) = 13;
    // retos cumplidos = {7, U} = 2 -> nivel 1.
    expect(usuario).toMatchObject({
      puntos: 13,
      historialPuntos: 13,
      retosCumplidos: 2,
      nivel: 1,
    });
    await registrar('8. U completo 1/1: +5 y nivel 1 (2do reto cumplido)');
  });

  it('finalizar el reto 7 completado no vuelve a pagar (sin doble cobro)', async () => {
    await request(app.getHttpServer())
      .post(`/supervisor/retos/${ID_RETO_PRUEBA}/decision`)
      .set('Authorization', `Bearer ${tokenSupervisor}`)
      .send({ estadoReto: EstadoReto.Finalizado })
      .expect(201);

    const resultado = await progreso.recalcularUsuario(ID_USUARIO);
    const usuario = await leerUsuario();

    expect(resultado).toMatchObject({ puntos: 13, historialPuntos: 13, nivel: 1 });
    expect(usuario).toMatchObject({
      puntos: 13,
      historialPuntos: 13,
      retosCumplidos: 2,
      nivel: 1,
    });
    await registrar('9. Cierre de reto 7 completado: sigue en 13');
  });

  afterAll(async () => {
    if (evidenciasCreadas.length > 0) {
      await participacionesRepo.delete(
        evidenciasCreadas.map((idParticipacion) => ({ idParticipacion })),
      );
    }

    if (inscripcionesCreadas.length > 0) {
      await inscripcionesRepo.delete(
        inscripcionesCreadas.map((idRetosParticipantes) => ({ idRetosParticipantes })),
      );
    }

    if (retosCreados.length > 0) {
      await retosRepo.delete(retosCreados.map((idReto) => ({ idReto })));
    }

    if (usuarioInicial) {
      await usuariosRepo.update(ID_USUARIO, {
        puntos: usuarioInicial.puntos,
        historialPuntos: usuarioInicial.historialPuntos,
        retosCumplidos: usuarioInicial.retosCumplidos,
        nivel: usuarioInicial.nivel,
      });
    }

    if (retoInicial) {
      await retosRepo.update(ID_RETO_PRUEBA, { estadoReto: retoInicial.estadoReto });
    }

    if (progreso) {
      // Estado final coherente con el modelo nuevo: el proximo recalculo de la
      // cron dejaria exactamente esto mismo.
      await progreso.recalcularUsuario(ID_USUARIO);
    }

    if (app) {
      await app.close();
    }

    console.log('\n=== PUNTOS POR EVIDENCIAS - USUARIO 7 ===');
    console.table(reporte);
    console.log(
      'Verificado:\n' +
        ' - Un reto parcial activo no paga nada (los dias digitados no importan).\n' +
        ' - 5/5 evidencias pagan 100% al instante y marcan el reto cumplido.\n' +
        ' - Negar una evidencia baja los puntos al instante y quita el cumplido.\n' +
        ' - Al cerrar, el tramo 50% se liquida con la misma cuenta de la cron.\n' +
        ' - Un reto completado no se paga dos veces al cerrar.\n' +
        'Estado de user 7 restaurado y recalculado (0/0/0/0 con reto 7 activo).',
    );
  });
});
