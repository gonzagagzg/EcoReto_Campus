import { registerAs } from '@nestjs/config';
import { requireEnv, toBool } from './env.validation';

export interface DatabaseEnv {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseEnv => {
    const synchronize = toBool(process.env.DB_SYNCHRONIZE, false);

    if (synchronize && process.env.NODE_ENV === 'production') {
      throw new Error(
        'DB_SYNCHRONIZE=true no se permite en produccion: el esquema se maneja con database/ScriptEcoRetoBD.sql',
      );
    }

    return {
      host: requireEnv('DB_HOST'),
      port: Number(requireEnv('DB_PORT')),
      username: requireEnv('DB_USER'),
      password: requireEnv('DB_PASSWORD'),
      database: requireEnv('DB_NAME'),
      synchronize,
      logging: toBool(process.env.DB_LOGGING, false),
    };
  },
);
