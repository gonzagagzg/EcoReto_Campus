import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { corsConfig } from './config/cors.config';
import { uploadsRoot } from './config/uploads.config';
import { HttpLoggerMiddleware } from './modules/logs/middleware/http-logger.middleware';
import { DbLoggerService } from './modules/logs/services/db-logger.service';

interface AplicacionExpress {
  use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void;
}

async function bootstrap() {
  // bufferLogs: retiene los logs de arranque hasta registrar el logger propio,
  // que ademas de imprimir los guarda en la tabla `logs` con su IP.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');

  app.useLogger(app.get(DbLoggerService));
  app.flushLogs();

  const cors = corsConfig();
  app.enableCors(cors);

  // Todas las rutas de la API quedan bajo /gg (ej: /gg/auth/login).
  // Los archivos estaticos y / no se ven afectados.
  app.setGlobalPrefix('gg');

  // Middleware de bitacora: abre el contexto de la peticion (para que los logs
  // internos hereden la IP) y registra cada acceso. Se monta antes de las rutas
  // porque Nest las registra al iniciar, no al crear la app.
  const httpLogger = app.get(HttpLoggerMiddleware);
  (app.getHttpAdapter().getInstance() as unknown as AplicacionExpress).use(
    httpLogger.use.bind(httpLogger) as unknown as (req: unknown, res: unknown, next: () => void) => void,
  );

  mkdirSync(uploadsRoot(), { recursive: true });
  // Panel de administracion (index.html en la raiz del servidor).
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/' });
  app.useStaticAssets(uploadsRoot(), { prefix: '/uploads/' });

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);

  logger.log(
    `API en http://localhost:${puerto}/gg | panel en http://localhost:${puerto}/ | archivos en http://localhost:${puerto}/uploads`,
  );
}

void bootstrap();
