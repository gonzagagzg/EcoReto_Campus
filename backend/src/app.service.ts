import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { MessageEvent } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { exhaustMap, interval, startWith, type Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { IaService } from './modules/ia/services/ia.service';
import { type ResumenLogs, LogsService } from './modules/logs/services/logs.service';
import {
  USUARIO_DAO,
  type UsuarioDaoInterface,
} from './modules/usuarios/daos/usuario.dao.interface';

export interface EstadoConexion {
  conectado: boolean;
  mensaje: string;
  /** true solo si la IA esta activada y se pudo conectar con Ollama. */
  ia: boolean;
}

/** Total de registros de una tabla. */
export interface ConteoTabla {
  tabla: string;
  total: number;
}

/** Estado de las conexiones que monitorea el panel. */
export interface EstadoConexiones {
  baseDatos: boolean;
  baseDatosMensaje: string;
  ollama: boolean;
  /** La API responde (esta peticion llego), por eso es true. */
  api: boolean;
}

export interface DatosDashboard {
  conexiones: EstadoConexiones;
  tablas: ConteoTabla[];
  logs: ResumenLogs;
}

/** Un punto de dato para una grafica: etiqueta (categoria/dia/nombre) + total. */
export interface DatoGrafica {
  etiqueta: string;
  total: number;
}

/** Estadisticas de negocio agregadas en vivo desde la BD para el panel. */
export interface Estadisticas {
  participacionesPorEstado: DatoGrafica[];
  retosPorCategoria: DatoGrafica[];
  retosPorDificultad: DatoGrafica[];
  soportePorEstado: DatoGrafica[];
  premiosPorEstado: DatoGrafica[];
  participacionesPorDia: DatoGrafica[];
  topUsuarios: DatoGrafica[];
}

/** Accion de usuario con los datos del autor, para la consola "Logs por usuario". */
export interface LogUsuario {
  idLog: number;
  fecha: string;
  ip: string | null;
  metodo: string | null;
  ruta: string | null;
  /** true solo para las lineas de acceso HTTP (contexto = HTTP). */
  esAccion: boolean;
  /** Mensaje original del log (solo se usa si no es una accion HTTP). */
  mensaje: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    alias: string;
  } | null;
}

/** Cada cuantos ms el flujo SSE del panel manda un ciclo nuevo. */
const INTERVALO_SSE_MS = 2000;

/**
 * Cuantas acciones de "Logs por usuario" viajan en el flujo SSE. Se envian
 * SIN filtro para que el panel pueda filtrar en el cliente al instante, sin
 * volver a pegarle a la base de datos en cada tecla del buscador.
 */
const LIMITE_LOGS_USUARIOS = 300;

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly iaService: IaService,
    private readonly logsService: LogsService,
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
  ) {}

  /**
   * Consulta real a la base: si el servidor no responde, cae al catch y
   * devuelve conectado=false con el detalle del error. La bandera `ia`
   * refleja si el modelo local de Ollama respondio, sin romper el resto
   * del estado si Ollama esta apagado.
   */
  async getEstadoConexion(): Promise<EstadoConexion> {
    let conectado = true;
    let mensaje = 'ok';

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      conectado = false;
      mensaje = `${error instanceof Error ? error.message : 'Error desconocido'}`;
    }

    return { conectado, mensaje, ia: await this.iaDisponible() };
  }

  /** Nunca lanza: si Ollama no responde, la IA se reporta como no disponible. */
  private async iaDisponible(): Promise<boolean> {
    try {
      const estado = await this.iaService.estado();
      return estado.habilitada && estado.disponible;
    } catch {
      return false;
    }
  }

  /**
   * Cuenta las filas de cada tabla del esquema `public`. Es el "total de
   * registros por tabla en tiempo real" del panel: se consulta al momento.
   */
  async getConteoTablas(): Promise<ConteoTabla[]> {
    try {
      const tablas = await this.dataSource.query<{ tablename: string }[]>(
        `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      );

      return await Promise.all(
        tablas.map(async ({ tablename }) => {
          const identificador = `"${tablename.replace(/"/g, '""')}"`;
          const filas = await this.dataSource.query<{ total: number }[]>(
            `SELECT COUNT(*)::int AS total FROM ${identificador}`,
          );

          return { tabla: tablename, total: filas[0]?.total ?? 0 };
        }),
      );
    } catch {
      return [];
    }
  }

  /** Foto completa del panel: conexiones + tablas + resumen de logs. */
  async getDashboard(): Promise<DatosDashboard> {
    const [estado, tablas, logs] = await Promise.all([
      this.getEstadoConexion(),
      this.getConteoTablas(),
      this.logsService.resumen(),
    ]);

    return {
      conexiones: {
        baseDatos: estado.conectado,
        baseDatosMensaje: estado.mensaje,
        ollama: estado.ia,
        api: true,
      },
      tablas,
      logs,
    };
  }

  /**
   * Ejecuta un GROUP BY dinamico sobre una columna y devuelve pares
   * (etiqueta,total). `tabla` y `columna` son cadenas fijas escritas en este
   * archivo (nunca vienen del usuario), por eso es seguro interpolarlas.
   * Si la tabla no existe, devuelve [] sin tumbar el panel.
   */
  private async contarPor(tabla: string, columna: string): Promise<DatoGrafica[]> {
    try {
      const filas = await this.dataSource.query<{ etiqueta: string; total: number }[]>(
        `SELECT ${columna}::text AS etiqueta, COUNT(*)::int AS total
         FROM ${tabla}
         GROUP BY ${columna}
         ORDER BY total DESC, etiqueta ASC`,
      );
      return filas.map((f) => ({ etiqueta: f.etiqueta ?? 'sin dato', total: f.total }));
    } catch {
      return [];
    }
  }

  /**
   * Estadisticas de negocio en vivo: cada grafica es una agregacion real sobre
   * la BD (participaciones, retos, soporte, canjes, usuarios). Todas corren en
   * paralelo y cada una falla por separado sin afectar a las demas.
   */
  async getEstadisticas(): Promise<Estadisticas> {
    const [participacionesPorEstado, retosPorCategoria, retosPorDificultad, soportePorEstado, premiosPorEstado, topUsuarios, participacionesPorDia] =
      await Promise.all([
        this.contarPor('participacion_reto', 'estado_participacion'),
        this.contarPor('retos', 'categoria'),
        this.contarPor('retos', 'dificultad'),
        this.contarPor('soporte', 'estado_soporte'),
        this.contarPor('historial_premios', 'estado_canje_premio'),
        this.topUsuariosPorPuntos(6),
        this.participacionesPorDia(14),
      ]);

    return {
      participacionesPorEstado,
      retosPorCategoria,
      retosPorDificultad,
      soportePorEstado,
      premiosPorEstado,
      topUsuarios,
      participacionesPorDia,
    };
  }

  /** Ranking de usuarios por puntos (top N) para el grafico de barras. */
  private async topUsuariosPorPuntos(limite: number): Promise<DatoGrafica[]> {
    try {
      const filas = await this.dataSource.query<{ etiqueta: string; total: number }[]>(
        `SELECT (nombre || ' ' || apellido) AS etiqueta, puntos::int AS total
         FROM usuarios
         ORDER BY puntos DESC, id_usuario ASC
         LIMIT $1`,
        [limite],
      );
      return filas.map((f) => ({ etiqueta: f.etiqueta, total: f.total }));
    } catch {
      return [];
    }
  }

  /** Participaciones creadas por dia en los ultimos N dias (serie temporal). */
  private async participacionesPorDia(dias: number): Promise<DatoGrafica[]> {
    try {
      const filas = await this.dataSource.query<{ etiqueta: string; total: number }[]>(
        `SELECT to_char(date_trunc('day', fecha_creacion), 'DD/MM') AS etiqueta,
                COUNT(*)::int AS total
         FROM participacion_reto
         WHERE fecha_creacion >= NOW() - ($1 || ' days')::interval
         GROUP BY date_trunc('day', fecha_creacion)
         ORDER BY date_trunc('day', fecha_creacion) ASC`,
        [dias],
      );
      return filas.map((f) => ({ etiqueta: f.etiqueta, total: f.total }));
    } catch {
      return [];
    }
  }

  /**
   * Bitacora de acciones de los usuarios: une `logs` con `usuarios` (JOIN de
   * solo lectura; la tabla `logs` sigue sin tener foreign keys). El parametro
   * `buscar` filtra por nombre, apellido, alias, correo o id de usuario.
   *
   * Es una consulta aparte del dashboard: solo la pide el panel cuando abre la
   * consola "Logs por usuario", asi no sobrecarga el flujo SSE en vivo.
   */
  async getLogsUsuarios(buscar: string, limite: number): Promise<LogUsuario[]> {
    const termino = (buscar ?? '').trim();
    const tope = Math.min(Math.max(limite || 100, 1), 500);

    try {
      const filas = await this.dataSource.query<
        {
          idLog: number;
          fecha: Date;
          ip: string | null;
          metodo: string | null;
          ruta: string | null;
          contexto: string | null;
          mensaje: string;
          id: number | null;
          nombre: string | null;
          apellido: string | null;
          correo: string | null;
          alias: string | null;
        }[]
      >(
        `SELECT l.id_log          AS "idLog",
                l.fecha          AS "fecha",
                l.ip             AS "ip",
                l.metodo         AS "metodo",
                l.ruta           AS "ruta",
                l.contexto       AS "contexto",
                l.mensaje        AS "mensaje",
                u.id_usuario     AS "id",
                u.nombre         AS "nombre",
                u.apellido       AS "apellido",
                u.correo         AS "correo",
                u.alias          AS "alias"
         FROM logs l
         JOIN usuarios u ON u.id_usuario = l.id_usuario
         WHERE l.id_usuario IS NOT NULL
           AND (
             $1 = ''
             OR u.nombre    ILIKE '%' || $1 || '%'
             OR u.apellido  ILIKE '%' || $1 || '%'
             OR u.alias     ILIKE '%' || $1 || '%'
             OR u.correo    ILIKE '%' || $1 || '%'
             OR u.id_usuario::text = $1
           )
         ORDER BY l.fecha DESC, l.id_log DESC
         LIMIT $2`,
        [termino, tope],
      );

      return filas.map((f) => ({
        idLog: f.idLog,
        fecha: f.fecha instanceof Date ? f.fecha.toISOString() : String(f.fecha),
        ip: f.ip,
        metodo: f.metodo,
        ruta: f.ruta,
        esAccion: f.contexto === 'HTTP',
        mensaje: f.mensaje,
        usuario:
          f.id !== null && f.nombre !== null
            ? {
                id: f.id,
                nombre: f.nombre,
                apellido: f.apellido ?? '',
                correo: f.correo ?? '',
                alias: f.alias ?? '',
              }
            : null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Vacia por completo la tabla `logs` (accion manual del admin). Exige la
   * contrasena del administrador autenticado para confirmar: se compara contra
   * el hash guardado y, si no coincide, se lanza 401 sin borrar nada.
   *
   * Devuelve cuantas filas fueron eliminadas.
   */
  async vaciarLogs(idUsuario: number, contrasena: string): Promise<{ eliminados: number }> {
    const usuario = await this.usuarioDao.buscarPorIdConContrasena(idUsuario);

    if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena))) {
      throw new UnauthorizedException('Contrasena incorrecta');
    }

    const eliminados = await this.logsService.vaciarTodo();
    return { eliminados };
  }

  /**
   * Flujo SSE del panel: en cada ciclo envia los logs nuevos, la bitacora por
   * usuario y el estado de conexiones (barato: un SELECT 1 + un ping con
   * timeout a Ollama), para que todo quede en vivo. El conteo por tabla y el
   * resumen de logs (consultas pesadas) solo viajan cada tercer ciclo.
   */
  streamDashboard(): Observable<MessageEvent> {
    let ultimoId = 0;
    let ciclo = 0;

    return interval(INTERVALO_SSE_MS).pipe(
      startWith(-1),
      exhaustMap(async () => {
        const nuevos = await this.logsService.listarDesde(ultimoId, 100);

        if (nuevos.length > 0) {
          ultimoId = nuevos[nuevos.length - 1].idLog;
        }

        const payload: Record<string, unknown> = { logs: nuevos };

        // El estado de conexiones viaja en cada ciclo: asi los badges del
        // topbar se actualizan en vivo y no solo con las consultas pesadas.
        const estado = await this.getEstadoConexion();
        payload.conexiones = {
          baseDatos: estado.conectado,
          baseDatosMensaje: estado.mensaje,
          ollama: estado.ia,
          api: true,
        } satisfies EstadoConexiones;

        if (ciclo % 3 === 0) {
          const [tablas, resumen] = await Promise.all([
            this.getConteoTablas(),
            this.logsService.resumen(),
          ]);

          payload.tablas = tablas;
          payload.resumenLogs = resumen;
        }

        // Bitacora "Logs por usuario" en vivo: viaja en cada ciclo para que la
        // consola se actualice sola. El filtro del buscador lo hace el panel.
        payload.logsUsuarios = await this.getLogsUsuarios('', LIMITE_LOGS_USUARIOS);

        ciclo += 1;

        return { data: JSON.stringify(payload) } as MessageEvent;
      }),
    );
  }
}
