import type { ValidationError } from '@nestjs/common';

/**
 * Traduce los mensajes de `class-validator` (ingles) al espanol antes de que
 * salgan de la API.
 *
 * class-validator escribe sus mensajes por defecto en ingles pegando el nombre
 * tecnico del campo, por ejemplo:
 *
 *   "contrasena must be longer than or equal to 8 characters"
 *
 * Eso no le sirve a la persona usuaria. Como los DTO no definen `message` en
 * cada decorador, se centraliza aqui la traduccion con `exceptionFactory`
 * (ver `app.module.ts`), sin tener que tocar los ~25 DTO.
 *
 * El texto final conserva el nombre del campo en espanol (correo, contraseña,
 * cedula...) a proposito: la pantalla de registro reparte cada mensaje a su
 * campo buscando esa palabra (ver `register.component.ts`).
 */

/**
 * Etiqueta legible de cada campo, con su articulo, tal como aparece al inicio
 * del mensaje ("La contraseña debe tener al menos 8 caracteres.").
 *
 * Los campos que no esten aqui usan el respaldo `El campo <nombre>`.
 */
const ETIQUETAS: Record<string, string> = {
  // auth
  correo: 'El correo',
  correoDestino: 'El correo de destino',
  contrasena: 'La contraseña',
  refreshToken: 'El token de sesion',
  // usuarios
  nombre: 'El nombre',
  apellido: 'El apellido',
  alias: 'El alias',
  cedula: 'La cédula',
  carrera: 'La carrera',
  nivelCarrera: 'El nivel de carrera',
  centroEstudios: 'El centro de estudios',
  idsGustos: 'Los gustos',
  estado: 'El estado',
  // retos y participaciones
  titulo: 'El título',
  descripcion: 'La descripción',
  categoria: 'La categoría',
  fechaLimite: 'La fecha límite',
  idReto: 'El reto',
  comentario: 'El comentario',
  // premios
  puntos: 'Los puntos',
  imagen: 'La imagen',
  idPremio: 'El premio',
  // soporte
  asunto: 'El asunto',
  respuesta: 'La respuesta',
  // gustos
  icono: 'El ícono',
  // admin y consultas
  idUsuario: 'El usuario',
  idGusto: 'El gusto',
  rol: 'El rol',
  motivo: 'El motivo',
  desde: 'La fecha inicial',
  hasta: 'La fecha final',
  pagina: 'La página',
  limite: 'El límite',
  tipo: 'El tipo',
  estadoEvaluacion: 'El estado de evaluación',
};

/** Frase de cada restriccion de class-validator, sin el nombre del campo. */
const FRASES: Record<string, (mensaje: string) => string> = {
  isString: () => 'debe ser texto.',
  isEmail: () => 'debe ser un correo electrónico válido.',
  isInt: () => 'debe ser un número entero.',
  minLength: (mensaje) => `debe tener al menos ${primerNumero(mensaje)} caracteres.`,
  maxLength: (mensaje) => `no puede tener más de ${primerNumero(mensaje)} caracteres.`,
  // `@Length(min, max)` (key "isLength") arma su mensaje segun lo que falle:
  // solo minimo, solo maximo, o ambos limites a la vez.
  isLength: (mensaje) => {
    const exigeMinimo = /longer than or equal to/i.test(mensaje);
    const exigeMaximo = /shorter than or equal to/i.test(mensaje);
    const numeros = numerosDe(mensaje);

    if (exigeMinimo && exigeMaximo) {
      return `debe tener entre ${numeros[0]} y ${numeros[1]} caracteres.`;
    }

    if (exigeMinimo) {
      return `debe tener al menos ${numeros[0]} caracteres.`;
    }

    return `no puede tener más de ${numeros[numeros.length - 1]} caracteres.`;
  },
  min: (mensaje) => `debe ser mayor o igual a ${primerNumero(mensaje)}.`,
  max: (mensaje) => `debe ser menor o igual a ${primerNumero(mensaje)}.`,
  isArray: () => 'debe ser una lista.',
  isBoolean: () => 'debe ser verdadero o falso.',
  isDate: () => 'debe ser una fecha válida.',
  isNotEmpty: () => 'no puede estar vacío.',
  isEnum: (mensaje) => `debe ser uno de estos valores: ${valoresPermitidos(mensaje)}.`,
  isIn: (mensaje) => `debe ser uno de estos valores: ${valoresPermitidos(mensaje)}.`,
  whitelistValidation: () => 'no está permitido en esta petición.',
  unknownValue: () => 'no es un valor válido.',
};

/** Mensaje de respaldo por si class-validator agrega una restriccion nueva. */
const FALLO_INESPERADO = 'no tiene un formato válido.';

/** Primer numero entero que aparece en el mensaje original (ej. el "8"). */
function primerNumero(mensaje: string): string {
  const [primero] = numerosDe(mensaje);

  return primero === undefined ? '' : String(primero);
}

/** Todos los enteros del mensaje original, en orden (ej. [8, 72] de Length). */
function numerosDe(mensaje: string): number[] {
  return (mensaje.match(/\d+/g) ?? []).map(Number);
}

/** Lista de valores tras "one of the following values: a, b" del original. */
function valoresPermitidos(mensaje: string): string {
  const parte = mensaje.split('values:')[1];
  return parte ? parte.trim() : 'los valores permitidos';
}

/** "contrasena" -> "La contraseña"; los demas -> "El campo contrasena". */
function etiqueta(propiedad: string): string {
  return ETIQUETAS[propiedad] ?? `El campo ${propiedad}`;
}

/**
 * Construye el mensaje en espanol de un error (una propiedad y sus
 * restricciones fallidas).
 *
 * `cada` es true cuando el error viene de una validacion `{ each: true }`
 * (listas): class-validator antepone "each value in ..." al mensaje.
 */
function mensajeEnEspanol(error: ValidationError): string[] {
  const restricciones = Object.entries(error.constraints ?? {});

  return restricciones.map(([tipo, mensajeOriginal]) => {
    const frase = (FRASES[tipo] ?? (() => FALLO_INESPERADO))(mensajeOriginal);
    const campo = etiqueta(error.property);

    if (mensajeOriginal.startsWith('each value in')) {
      return `Cada valor de ${campo.charAt(0).toLowerCase()}${campo.slice(1)} ${frase}`;
    }

    return `${campo} ${frase}`;
  });
}

/**
 * Recorre la lista de errores de class-validator (incluidos los anidados) y
 * devuelve los mensajes ya en espanol.
 */
function recorrer(errores: ValidationError[]): string[] {
  return errores.flatMap((error) => [
    ...mensajeEnEspanol(error),
    ...recorrer(error.children ?? []),
  ]);
}

/**
 * `exceptionFactory` del `ValidationPipe`: recibe los errores crudos de
 * class-validator y devuelve `["La contraseña debe tener al menos 8 caracteres."]`.
 *
 * El formato es el mismo que el del pipe por defecto: un arreglo de mensajes.
 */
export function mensajesDeValidacion(errores: ValidationError[]): string[] {
  const mensajes = recorrer(errores);

  return mensajes.length > 0
    ? mensajes
    : ['Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.'];
}
