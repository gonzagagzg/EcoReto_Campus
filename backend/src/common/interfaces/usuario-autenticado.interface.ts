import type { Rol } from '../../modules/usuarios/entities/usuario.entity';

export interface UsuarioAutenticado {
  idUsuario: number;
  correo: string;
  alias: string;
  rol: Rol;
  estado: string;
}

export interface TokenPayload {
  sub: number;
  correo: string;
  alias: string;
  rol: Rol;
  tipo: 'access' | 'refresh';
}
