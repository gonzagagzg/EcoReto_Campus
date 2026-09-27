import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { databaseConfig, jwtConfig, validateEnv } from './config';
import type { DatabaseEnv } from './config';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParticipacionesModule } from './modules/participaciones/participaciones.module';
import { PremiosModule } from './modules/premios/premios.module';
import { RetosModule } from './modules/retos/retos.module';
import { SoporteModule } from './modules/soporte/soporte.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { TasksModule } from './tasks/tasks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: DatabaseEnv) => ({
        type: 'postgres' as const,
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        autoLoadEntities: true,
        synchronize: db.synchronize,
        logging: db.logging,
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsuariosModule,
    RetosModule,
    ParticipacionesModule,
    PremiosModule,
    SoporteModule,
    SupervisorModule,
    AdminModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}