/** Archivo multipart recibido por los interceptores de Nest (multer en memoria). */
export interface ArchivoSubido {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  path?: string;
}
