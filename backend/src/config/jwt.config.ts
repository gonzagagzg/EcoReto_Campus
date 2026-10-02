import { registerAs } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { requireEnv } from './env.validation';

export interface JwtEnv {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export const jwtConfig = registerAs('jwt', (): JwtEnv => ({
  secret: requireEnv('JWT_SECRET'),
  expiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));

export function accessTokenOptions(env: JwtEnv): JwtSignOptions {
  return {
    secret: env.secret,
    expiresIn: env.expiresIn as JwtSignOptions['expiresIn'],
  };
}

export function refreshTokenOptions(env: JwtEnv): JwtSignOptions {
  return {
    secret: env.refreshSecret,
    expiresIn: env.refreshExpiresIn as JwtSignOptions['expiresIn'],
  };
}
