import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError, mensajesDeError } from './error-http';

/**
 * Regresion del bug en el que toda respuesta HTTP se reportaba como
 * "No se pudo conectar con el servidor": Angular arma `HttpErrorResponse.message`
 * como "Http failure response for <url>: <status>", y ese texto se confundia
 * con un fallo de red aunque el backend si hubiera respondido.
 */
describe('mensajeDeError', () => {
  it('muestra el mensaje del backend cuando la contrasena es incorrecta (401)', () => {
    const error = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: '/gg/auth/login',
      error: { statusCode: 401, message: 'Credenciales invalidas', error: 'Unauthorized' },
    });

    expect(mensajeDeError(error)).toBe('Credenciales invalidas');
  });

  it('no confunde un error de validacion (400) con una caida de red', () => {
    const error = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      url: '/gg/auth/registro',
      error: { statusCode: 400, message: ['El correo debe ser institucional'] },
    });

    expect(mensajeDeError(error)).toBe('El correo debe ser institucional');
  });

  it('reporta fallo de conexion cuando el servidor no responde (status 0)', () => {
    const error = new HttpErrorResponse({ status: 0, url: '/gg/retos' });

    expect(mensajeDeError(error)).toContain('No se pudo conectar con el servidor');
  });

  it('oculta los detalles internos del backend en un 500', () => {
    const error = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
      url: '/gg/retos',
      error: { statusCode: 500, message: 'Error: ER_ROW_IS_REFERENCED_2 ...' },
    });

    expect(mensajeDeError(error)).toContain('El servidor está teniendo problemas');
  });

  it('usa el texto amigable del codigo cuando el backend no manda mensaje', () => {
    const error = new HttpErrorResponse({ status: 404, url: '/gg/premios/9' });

    expect(mensajeDeError(error)).toContain('No se encontró lo que buscabas');
  });

  it('reconoce el texto de red de Error normal (WebView/Capacitor)', () => {
    expect(mensajeDeError(new Error('Failed to fetch'))).toContain(
      'No se pudo conectar con el servidor',
    );
    expect(mensajeDeError(new Error('unable to resolve host'))).toContain(
      'No se pudo conectar con el servidor',
    );
  });

  it('responde con un texto generico ante un error no HTTP', () => {
    expect(mensajeDeError('algo raro')).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.');
  });
});

describe('mensajesDeError', () => {
  it('separa los mensajes de validacion que vienen como arreglo', () => {
    const error = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      url: '/gg/auth/registro',
      error: {
        statusCode: 400,
        message: ['El correo debe ser institucional', 'La contrasena es muy corta'],
      },
    });

    expect(mensajesDeError(error)).toEqual([
      'El correo debe ser institucional',
      'La contrasena es muy corta',
    ]);
  });

  it('devuelve el mensaje de conexion ante un fallo de red', () => {
    expect(mensajesDeError(new HttpErrorResponse({ status: 0, url: '/gg/retos' }))).toEqual([
      'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
    ]);
  });
});
