import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { accessTokenOptions, jwtConfig, refreshTokenOptions } from '../../../config/jwt.config';
import type { TokenPayload } from '../../../common/interfaces/usuario-autenticado.interface';
import {
  USUARIO_DAO,
  type UsuarioDaoInterface,
} from '../../usuarios/daos/usuario.dao.interface';
import { EstadoUsuario, type Usuario } from '../../usuarios/entities/usuario.entity';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegistroDto } from '../dto/registro.dto';

export interface RespuestaAuth {
  accessToken: string;
  refreshToken: string;
  alias: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
    private readonly jwtService: JwtService,
  ) {}

  async registrar(dto: RegistroDto): Promise<{ alias: string }> {
    const correo = dto.correo.trim().toLowerCase();

    if (await this.usuarioDao.existeCorreoOCedula(correo, dto.cedula)) {
      throw new ConflictException('El correo o la cedula ya estan registrados');
    }

    const usuario = await this.usuarioDao.crear({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo,
      alias: dto.alias,
      cedula: dto.cedula,
      contrasena: await bcrypt.hash(dto.contrasena, 10),
      carrera: dto.carrera ?? null,
      nivelCarrera: dto.nivelCarrera ?? null,
      centroEstudios: dto.centroEstudios ?? null,
      estado: EstadoUsuario.Pendiente,
    });

    if (dto.idsGustos?.length) {
      await this.usuarioDao.reemplazarGustos(usuario.idUsuario, dto.idsGustos);
    }

    this.logger.log(`Usuario ${usuario.idUsuario} registrado (${usuario.correo})`);

    return { alias: usuario.alias };
  }

  async login(dto: LoginDto): Promise<RespuestaAuth> {
    const usuario = await this.usuarioDao.buscarPorCorreoConContrasena(dto.correo);

    if (!usuario || !(await bcrypt.compare(dto.contrasena, usuario.contrasena))) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    this.validarEstado(usuario);

    return this.generarTokens(usuario);
  }

  async refrescar(dto: RefreshTokenDto): Promise<RespuestaAuth> {
    const env = jwtConfig();
    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(dto.refreshToken, {
        secret: env.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (payload.tipo !== 'refresh') {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const usuario = await this.usuarioDao.buscarPorId(payload.sub);

    if (!usuario) {
      throw new UnauthorizedException('El usuario del token ya no existe');
    }

    this.validarEstado(usuario);

    return this.generarTokens(usuario);
  }

  async validarToken(token: string): Promise<Usuario> {
    const env = jwtConfig();

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: env.secret,
      });

      const usuario = await this.usuarioDao.buscarPorId(payload.sub);

      if (!usuario) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      this.validarEstado(usuario);

      return usuario;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token invalido o expirado');
    }
  }

  private validarEstado(usuario: Usuario): void {
    if (usuario.estado === EstadoUsuario.Pendiente) {
      throw new ForbiddenException('Tu cuenta esta pendiente de aprobacion');
    }

    if (usuario.estado === EstadoUsuario.Bloqueado) {
      throw new ForbiddenException('Tu cuenta esta bloqueada, contacta al administrador');
    }

    if (usuario.estado === EstadoUsuario.Desactivo) {
      throw new ForbiddenException('Tu cuenta esta desactiva');
    }
  }

  private async generarTokens(usuario: Usuario): Promise<RespuestaAuth> {
    const env = jwtConfig();
    const payload: Omit<TokenPayload, 'tipo'> = {
      sub: usuario.idUsuario,
      correo: usuario.correo,
      alias: usuario.alias,
      rol: usuario.rol,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, tipo: 'access' }, accessTokenOptions(env)),
      this.jwtService.signAsync({ ...payload, tipo: 'refresh' }, refreshTokenOptions(env)),
    ]);

    return { accessToken, refreshToken, alias: usuario.alias };
  }
}
