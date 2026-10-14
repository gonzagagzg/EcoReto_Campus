import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RespuestaEstandar<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/** Envuelve la respuesta de los endpoints que lo apliquen con { success, data, timestamp }. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, RespuestaEstandar<T> | T> {
  intercept(contexto: ExecutionContext, next: CallHandler<T>): Observable<RespuestaEstandar<T> | T> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
