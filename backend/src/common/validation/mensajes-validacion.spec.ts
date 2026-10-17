import { validate } from 'class-validator';
import type { ValidationError } from '@nestjs/common';
import { CambiarRolDto } from '../../modules/admin/dto/cambiar-rol.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { RegistroDto } from '../../modules/auth/dto/registro.dto';
import { CrearGustoDto } from '../../modules/gustos/dto/crear-gusto.dto';
import { CrearParticipacionDto } from '../../modules/participaciones/dto/crear-participacion.dto';
import { mensajesDeValidacion } from './mensajes-validacion';

/**
 * Valida un DTO real con class-validator y devuelve los mensajes ya traducidos,
 * que es exactamente lo que hace el `ValidationPipe` en produccion.
 */
async function traducir(dto: object): Promise<string[]> {
  return mensajesDeValidacion(await validate(dto));
}

function login(correo: string, contrasena: string): LoginDto {
  const dto = new LoginDto();
  dto.correo = correo;
  dto.contrasena = contrasena;
  return dto;
}

function registro(): RegistroDto {
  const dto = new RegistroDto();
  dto.nombre = 'Ana';
  dto.apellido = 'Gómez';
  dto.correo = 'ana@correo.edu.co';
  dto.alias = 'anag';
  dto.cedula = '12345678';
  dto.contrasena = 'Contrasena1!';
  return dto;
}

describe('mensajesDeValidacion', () => {
  it('traduce el minimo de longitud de la contraseña', async () => {
    const mensajes = await traducir(login('ana@correo.edu.co', 'corta'));

    expect(mensajes).toEqual(['La contraseña debe tener al menos 8 caracteres.']);
  });

  it('conserva la palabra del campo para que el registro lo asigne a su input', async () => {
    const mensajes = await traducir(login('ana@correo.edu.co', 'corta'));

    expect(mensajes[0]).toContain('contraseña');
  });

  it('traduce el correo invalido', async () => {
    const mensajes = await traducir(login('no-es-un-correo', 'contrasena-larga'));

    expect(mensajes).toEqual(['El correo debe ser un correo electrónico válido.']);
  });

  it('traduce el maximo de longitud', async () => {
    const dto = registro();
    dto.nombre = 'a'.repeat(101);

    const mensajes = await traducir(dto);

    expect(mensajes).toEqual(['El nombre no puede tener más de 100 caracteres.']);
  });

  it('traduce Length cuando falla el minimo', async () => {
    const dto = new CrearGustoDto();
    dto.nombre = 'ab';

    const mensajes = await traducir(dto);

    expect(mensajes).toEqual(['El nombre debe tener al menos 3 caracteres.']);
  });

  it('traduce Length cuando falla el maximo', async () => {
    const dto = new CrearGustoDto();
    dto.nombre = 'Nombre';
    dto.descripcion = 'a'.repeat(256);

    const mensajes = await traducir(dto);

    expect(mensajes).toEqual(['La descripción no puede tener más de 255 caracteres.']);
  });

  it('traduce el minimo numerico', async () => {
    const dto = new CrearParticipacionDto();
    dto.idReto = 0;

    const mensajes = await traducir(dto);

    expect(mensajes).toEqual(['El reto debe ser mayor o igual a 1.']);
  });

  it('traduce la lista de valores de un enum', async () => {
    const dto = new CambiarRolDto();
    dto.rol = 'Invitado' as never;

    const mensajes = await traducir(dto);

    expect(mensajes).toEqual([
      'El rol debe ser uno de estos valores: Usuario, Supervisor, Administrador.',
    ]);
  });

  it('traduce los errores de listas validadas con each', async () => {
    const dto = registro();
    dto.idsGustos = ['no-es-entero'] as never;

    const mensajes = await traducir(dto);

    expect(mensajes).toContain('Cada valor de los gustos debe ser un número entero.');
  });

  it('traduce el campo que no esta permitido (whitelist)', async () => {
    const dto = login('ana@correo.edu.co', 'contrasena-larga');
    (dto as unknown as Record<string, unknown>)['rol'] = 'Administrador';

    const errores = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(mensajesDeValidacion(errores)).toEqual([
      'El rol no está permitido en esta petición.',
    ]);
  });

  it('usa un respaldo legible si class-validator agrega una restriccion nueva', () => {
    const errores: ValidationError[] = [
      {
        property: 'campoRaro',
        constraints: { restriccionFutura: 'campoRaro must be something' },
      },
    ];

    expect(mensajesDeValidacion(errores)).toEqual([
      'El campo campoRaro no tiene un formato válido.',
    ]);
  });

  it('recorre los errores anidados', () => {
    const errores: ValidationError[] = [
      {
        property: 'gusto',
        children: [
          {
            property: 'nombre',
            constraints: { isString: 'nombre must be a string' },
          },
        ],
      },
    ];

    expect(mensajesDeValidacion(errores)).toEqual(['El nombre debe ser texto.']);
  });

  it('responde con un mensaje generico si no hay errores utilizables', () => {
    expect(mensajesDeValidacion([])).toEqual([
      'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
    ]);
  });
});
