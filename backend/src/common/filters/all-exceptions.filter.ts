import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const request = contexto.getRequest<Request>();
    const response = contexto.getResponse<Response>();

    const status =
      excepcion instanceof HttpException
        ? excepcion.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const detalle = excepcion instanceof HttpException ? excepcion.getResponse() : undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        excepcion instanceof Error ? excepcion.stack : String(excepcion),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}`);
    }

    response.status(status).json(detalle ?? { statusCode: status, message: 'Error interno del servidor' });
  }
}
