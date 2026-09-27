import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { uploadsRoot } from './config/uploads.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({ origin: true, credentials: true });

  mkdirSync(uploadsRoot(), { recursive: true });
  app.useStaticAssets(uploadsRoot(), { prefix: '/uploads/' });

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);

  logger.log(`API en http://localhost:${puerto} | archivos en http://localhost:${puerto}/uploads`);
}

void bootstrap();
