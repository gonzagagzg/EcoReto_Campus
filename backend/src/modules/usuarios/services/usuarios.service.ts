import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import {
  buildGustoDir,
  buildGustoNombreArchivo,
  buildGustoPathRelativo,
  buildUsuarioDir,
  buildUsuarioNombreArchivo,
  buildUsuarioPathRelativo,
  ensureUploadDir,
} from '../../../config/uploads.config';
import { retosRequeridosParaNivel } from '../../retos/reglas-reto';
import { ActualizarGustoDto } from '../dto/actualizar-gusto.dto';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { ActualizarUsuarioDto } from '../dto/actualizar-usuario.dto';
import { CambiarEstadoUsuarioDto } from '../dto/cambiar-estado-usuario.dto';
import { CrearGustoDto } from '../dto/crear-gusto.dto';
import { GustosUsuarioDto } from '../dto/gustos-usuario.dto';
import { UsuarioQueryDto } from '../dto/usuario-query.dto';
import type { Gusto } from '../entities/gusto.entity';
import { EstadoGusto } from '../entities/gusto.entity';
import {
  type FiltrosUsuario,
  type FiltrosGusto,
  type UsuarioDaoInterface,
  USUARIO_DAO,
} from '../daos/usuario.dao.interface';
import { EstadoUsuario, Rol, type Usuario } from '../entities/usuario.entity';

export interface Solicitud {
  idUsuario: number;
  rol: Rol;
}

export interface PerfilUsuario extends Usuario {
  gustos: Gusto[];
  estadisticas: EstadisticasUsuario;
}

export interface EstadisticasUsuario {
  nivel: number;
  puntos: number;
  retosCumplidos: number;
  retosRequeridosParaSiguienteNivel: number;
  progresoNivel: number;
}

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
  ) {}

  /**
   * Listado de usuarios. Supervisor y Administrador reciben todos los campos; el resto
   * solo ve los datos publicos, sin cedula ni correo.
   */
  async listar(
    query: UsuarioQueryDto,
    solicitante?: Solicitud,
  ): Promise<{ items: Usuario[]; total: number }> {
    const { pagina, limite, ...filtros } = query;
    const esStaff = solicitante ? this.esStaff(solicitante.rol) : false;
    const resultado = await this.usuarioDao.listar(
      this.aPaginacion({ ...filtros, excluirDesactivados: !esStaff }, pagina, limite),
    );

    if (esStaff) {
      return resultado;
    }

    return {
      ...resultado,
      items: resultado.items.map((usuario) => this.aPerfilPublico(usuario)),
    };
  }

  async obtener(idUsuario: number): Promise<Usuario> {
    const usuario = await this.usuarioDao.buscarPorId(idUsuario);

    if (!usuario) {
      throw new NotFoundException(`Usuario ${idUsuario} no encontrado`);
    }

    return usuario;
  }

  /** Vista de solo lectura: las claves de correo y cedula ni siquiera llegan a la respuesta. */
  private aPerfilPublico(usuario: Usuario): Usuario {
    const { cedula: _cedula, correo: _correo, ...publico } = usuario;

    return publico as Usuario;
  }

  private esStaff(rol: Rol): boolean {
    return rol === Rol.Administrador || rol === Rol.Supervisor;
  }

  /** Perfil propio: incluye los gustos y las estadisticas de nivel y puntos. */
  async perfil(idUsuario: number): Promise<PerfilUsuario> {
    const usuario = await this.obtener(idUsuario);
    const gustos = await this.usuarioDao.listarGustos(idUsuario);

    return { ...usuario, gustos, estadisticas: this.calcularEstadisticas(usuario) };
  }

  /**
   * Perfil ajeno en modo lectura: sin cedula, correo ni datos de contacto.
   * Incluye los gustos del usuario.
   */
  async perfilPublico(idUsuario: number, solicitante: Solicitud): Promise<Partial<Usuario> & { gustos: Gusto[] }> {
    const usuario = await this.obtener(idUsuario);

    if (solicitante.idUsuario === idUsuario) {
      return this.perfil(idUsuario);
    }

    // Las cuentas dadas de baja desaparecen para todo el que no sea staff.
    if (!this.esStaff(solicitante.rol) && usuario.estado === EstadoUsuario.Desactivo) {
      throw new NotFoundException(`Usuario ${idUsuario} no encontrado`);
    }

    const gustos = await this.usuarioDao.listarGustos(idUsuario);
    return { ...this.aPerfilPublico(usuario), gustos };
  }

  /** Edicion directa del perfil propio: alias, carrera, centro de estudios y contrasena. */
  async actualizarPerfil(idUsuario: number, dto: ActualizarPerfilDto): Promise<Usuario> {
    return this.usuarioDao.actualizar(idUsuario, {
      ...dto,
      ...(dto.contrasena ? { contrasena: await bcrypt.hash(dto.contrasena, 10) } : {}),
    });
  }

  /** Edicion completa: solo Administrador (tambien via ticket de soporte). */
  async actualizar(idUsuario: number, dto: ActualizarUsuarioDto): Promise<Usuario> {
    const { contrasena, ...campos } = dto;

    if (dto.correo) {
      await this.validarCorreo(dto.correo, idUsuario);
    }

    if (dto.cedula) {
      await this.validarCedula(dto.cedula, idUsuario);
    }

    return this.usuarioDao.actualizar(idUsuario, {
      ...campos,
      ...(dto.correo ? { correo: dto.correo.trim().toLowerCase() } : {}),
      ...(contrasena ? { contrasena: await bcrypt.hash(contrasena, 10) } : {}),
    });
  }

  async cambiarEstado(idUsuario: number, dto: CambiarEstadoUsuarioDto): Promise<Usuario> {
    await this.obtener(idUsuario);
    return this.usuarioDao.actualizarEstado(idUsuario, dto.estado);
  }

  async activar(idUsuario: number): Promise<Usuario> {
    return this.cambiarEstado(idUsuario, { estado: EstadoUsuario.Activo });
  }

  async cambiarRol(idUsuario: number, rol: Rol): Promise<Usuario> {
    await this.obtener(idUsuario);
    return this.usuarioDao.cambiarRol(idUsuario, rol);
  }

  async eliminar(idUsuario: number): Promise<{ eliminado: boolean }> {
    return { eliminado: await this.usuarioDao.eliminar(idUsuario) };
  }

  /** Los gustos son preferencias: solo el propio usuario o el personal autorizado los consulta. */
  listarGustos(idUsuario: number, solicitante: Solicitud) {
    this.validarAccesoPropio(idUsuario, solicitante);

    return this.usuarioDao.listarGustos(idUsuario);
  }

  listarCatalogoGustos() {
    return this.usuarioDao.listarCatalogoGustos();
  }

  async actualizarFoto(idUsuario: number, foto: ArchivoSubido): Promise<Usuario> {
    await this.obtener(idUsuario);

    const directorio = ensureUploadDir(buildUsuarioDir(idUsuario));
    const nombreArchivo = buildUsuarioNombreArchivo(idUsuario);

    await writeFile(join(directorio, nombreArchivo), foto.buffer);

    return this.usuarioDao.actualizar(idUsuario, {
      imagenUsuario: buildUsuarioPathRelativo(idUsuario),
    });
  }

  async actualizarGustos(idUsuario: number, dto: GustosUsuarioDto, solicitante: Solicitud) {
    this.validarAccesoPropio(idUsuario, solicitante);
    await this.obtener(idUsuario);

    return this.usuarioDao.reemplazarGustos(idUsuario, dto.idsGustos);
  }

  contarPorEstado() {
    return this.usuarioDao.contarPorEstado();
  }

  /** Top de estudiantes por puntos, sin staff. */
  async topUsuarios(limite = 20): Promise<Usuario[]> {
    return this.usuarioDao.listarTopPorPuntos(Rol.Usuario, limite);
  }

  /** Listado de gustos para admin con filtros y paginación. */
  listarGustosAdmin(query: UsuarioQueryDto): Promise<{ items: Gusto[]; total: number }> {
    const { pagina, limite, busqueda, estado } = query;
    return this.usuarioDao.listarGustosAdmin({
      busqueda,
      estado: estado as EstadoGusto | undefined,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  /** Busca un gusto por ID. */
  async obtenerGusto(idGusto: number): Promise<Gusto> {
    const gusto = await this.usuarioDao.buscarGustoPorId(idGusto);

    if (!gusto) {
      throw new NotFoundException(`Gusto ${idGusto} no encontrado`);
    }

    return gusto;
  }

  /** Crea un nuevo gusto. */
  async crearGusto(dto: CrearGustoDto): Promise<Gusto> {
    return this.usuarioDao.crearGusto({
      ...dto,
      imagenGusto: dto.imagenGusto?.trim() || null,
      estado: EstadoGusto.Activo,
    });
  }

  /** Actualiza un gusto existente. */
  async actualizarGusto(idGusto: number, dto: ActualizarGustoDto): Promise<Gusto> {
    await this.obtenerGusto(idGusto);
    return this.usuarioDao.actualizarGusto(idGusto, dto);
  }

  /** Elimina (baja lógica) un gusto. */
  async eliminarGusto(idGusto: number): Promise<{ eliminado: boolean }> {
    return { eliminado: await this.usuarioDao.eliminarGusto(idGusto) };
  }

  /** Sube la imagen del gusto a disco y devuelve la ruta relativa para BD. */
  async subirImagenGusto(
    idGusto: number,
    archivo: ArchivoSubido,
  ): Promise<string> {
    await this.obtenerGusto(idGusto);
    const dir = ensureUploadDir(buildGustoDir(idGusto));
    const nombreArchivo = buildGustoNombreArchivo(idGusto);
    await writeFile(join(dir, nombreArchivo), archivo.buffer);
    return buildGustoPathRelativo(idGusto);
  }

  async eliminarImagenGusto(idGusto: number): Promise<void> {
    await this.obtenerGusto(idGusto);
    const dir = buildGustoDir(idGusto);
    const { rm } = await import('node:fs/promises');
    await rm(dir, { recursive: true, force: true });
    await this.usuarioDao.actualizarGusto(idGusto, { imagenGusto: null });
  }

  private validarAccesoPropio(idUsuario: number, solicitante: Solicitud): void {
    if (solicitante.idUsuario !== idUsuario && solicitante.rol !== Rol.Administrador) {
      throw new ForbiddenException('Solo puedes modificar tu propio perfil');
    }
  }

  private calcularEstadisticas(usuario: Usuario): EstadisticasUsuario {
    const nivel = usuario.nivel;
    const retosRequeridosParaSiguienteNivel = retosRequeridosParaNivel(nivel + 1);
    const retosRequeridosNivelActual = retosRequeridosParaNivel(nivel);
    const progresoNivel =
      retosRequeridosParaSiguienteNivel === retosRequeridosNivelActual
        ? 100
        : Math.min(
            100,
            Math.round(
              ((usuario.retosCumplidos - retosRequeridosNivelActual) /
                (retosRequeridosParaSiguienteNivel - retosRequeridosNivelActual)) *
                100,
            ),
          );

    return {
      nivel,
      puntos: usuario.puntos,
      retosCumplidos: usuario.retosCumplidos,
      retosRequeridosParaSiguienteNivel,
      progresoNivel: Math.max(0, progresoNivel),
    };
  }

  private aPaginacion(
    filtros: FiltrosUsuario,
    pagina: number,
    limite: number,
  ): FiltrosUsuario {
    return { ...filtros, skip: (pagina - 1) * limite, take: limite };
  }

  private async validarCorreo(correo: string, idUsuario: number): Promise<void> {
    const existente = await this.usuarioDao.buscarPorCorreo(correo);

    if (existente && existente.idUsuario !== idUsuario) {
      throw new ConflictException('El correo ya esta registrado');
    }
  }

  /** La cedula es unica; sin esto el UNIQUE de la base responderia 500. */
  private async validarCedula(cedula: string, idUsuario: number): Promise<void> {
    const existente = await this.usuarioDao.buscarPorCedula(cedula);

    if (existente && existente.idUsuario !== idUsuario) {
      throw new ConflictException('La cedula ya esta registrada');
    }
  }
}
