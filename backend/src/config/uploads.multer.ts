import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { esExtensionImagen, MAX_BYTES_IMAGEN } from './uploads.config';

/** MIME permitidos; la extension sola no alcanza para validar el contenido real. */
const MIME_IMAGEN = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function soloImagenes(
  _req: unknown,
  archivo: { originalname?: string; mimetype?: string } | undefined,
  callback: (error: Error | null, aceptar: boolean) => void,
): void {
  if (!archivo?.originalname || !esExtensionImagen(archivo.originalname)) {
    callback(new BadRequestException('Solo se permiten imagenes jpg, jpeg, png o webp'), false);
    return;
  }

  if (!archivo.mimetype || !MIME_IMAGEN.has(archivo.mimetype.toLowerCase())) {
    callback(new BadRequestException('El contenido del archivo no es una imagen valida'), false);
    return;
  }

  callback(null, true);
}

/** Sin `storage` multer usa memoria por defecto. Imagenes de reto, perfil y soporte: maximo 5 MB. */
export const opcionesImagen: MulterOptions = {
  limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 },
  fileFilter: soloImagenes,
};

/** Evidencias de participacion: maximo 5 MB por archivo. */
export const opcionesEvidencia: MulterOptions = {
  limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 },
  fileFilter: soloImagenes,
};
