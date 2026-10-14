import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../../modules/usuarios/entities/usuario.entity';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a los roles indicados (Usuario, Supervisor, Administrador). */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
