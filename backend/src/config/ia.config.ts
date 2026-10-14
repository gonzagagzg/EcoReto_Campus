import { registerAs } from '@nestjs/config';
import { toBool } from './env.validation';

export interface IaEnv {
  habilitada: boolean;
  modelo: string;
  host: string;
  /** Timeout para la respuesta de Ollama (ms). */
  timeoutMs: number;
  /** Clave para Ollama en la nube o tras un proxy (se envia como Bearer). */
  apiKey?: string;
  /** Usuario/contrasena para un proxy con autenticacion basica. */
  basicUser?: string;
  basicPassword?: string;
}

/** Vacio o ausente equivale a no configurado. */
function opcional(key: string): string | undefined {
  const valor = process.env[key]?.trim();
  return valor ? valor : undefined;
}

/**
 * Asistente IA local (Ollama). Se activa con IA_ENABLED=true en backend/.env;
 * apagada por defecto para no exigir el servidor de Ollama en cada entorno.
 * Las credenciales son opcionales: un Ollama local no las necesita.
 */
export const iaConfig = registerAs(
  'ia',
  (): IaEnv => ({
    habilitada: toBool(process.env.IA_ENABLED, false),
    modelo: process.env.IA_MODEL?.trim() || 'llama3-abliterated',
    host: process.env.OLLAMA_HOST?.trim() || 'http://localhost:11434',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000),
    apiKey: opcional('OLLAMA_API_KEY'),
    basicUser: opcional('OLLAMA_BASIC_USER'),
    basicPassword: opcional('OLLAMA_BASIC_PASSWORD'),
  }),
);
