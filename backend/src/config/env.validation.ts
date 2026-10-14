import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  PORT?: string;

  @IsNotEmpty()
  @IsString()
  DB_HOST!: string;

  @IsNumber()
  DB_PORT!: number;

  @IsNotEmpty()
  @IsString()
  DB_USER!: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD!: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME!: string;

  @IsOptional()
  @IsBoolean()
  DB_SYNCHRONIZE?: boolean;

  @IsOptional()
  @IsBoolean()
  DB_LOGGING?: boolean;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  @IsNotEmpty()
  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsOptional()
  @IsString()
  UPLOADS_DIR?: string;

  @IsOptional()
  @IsString()
  CORREO_DOMINIOS_INSTITUCIONALES?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsBoolean()
  IA_ENABLED?: boolean;

  @IsOptional()
  @IsString()
  IA_MODEL?: string;

  @IsOptional()
  @IsString()
  OLLAMA_HOST?: string;

  @IsOptional()
  @IsString()
  OLLAMA_API_KEY?: string;

  @IsOptional()
  @IsString()
  OLLAMA_BASIC_USER?: string;

  @IsOptional()
  @IsString()
  OLLAMA_BASIC_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  OLLAMA_TIMEOUT_MS?: number;
}

/** Acepta true/1/yes/on sin distinguir mayusculas; cualquier otra cosa es false. */
export function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/** Lee una variable obligatoria sin dejar valores por defecto en el codigo. */
export function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${key}. Agregala a backend/.env con ese nombre.`,
    );
  }

  return value;
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Configuracion de entorno invalida: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join(' | ')}`,
    );
  }

  return config;
}
