import {
  Check,
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GustoUsuario } from './gusto_usuario.entity';

export enum Rol {
  Usuario = 'Usuario',
  Supervisor = 'Supervisor',
  Administrador = 'Administrador',
}

export enum EstadoUsuario {
  Pendiente = 'pendiente',
  Activo = 'activo',
  Desactivo = 'desactivo',
  Bloqueado = 'bloqueado',
}

@Entity('usuarios')
@Check('usuarios_puntos_check', 'puntos >= 0')
export class Usuario {
  @PrimaryGeneratedColumn('increment', { name: 'id_usuario' })
  idUsuario!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ name: 'apellido', type: 'varchar', length: 100 })
  apellido!: string;

  @Column({ name: 'correo', type: 'varchar', length: 150, unique: true })
  correo!: string;

  @Column({ name: 'alias', type: 'varchar', length: 50 })
  alias!: string;

  @Column({ name: 'carrera', type: 'varchar', length: 100, nullable: true })
  carrera!: string | null;

  @Column({ name: 'nivel_carrera', type: 'varchar', length: 50, nullable: true })
  nivelCarrera!: string | null;

  @Column({ name: 'centro_estudios', type: 'varchar', length: 150, nullable: true })
  centroEstudios!: string | null;

  @Column({ name: 'contrasena', type: 'varchar', length: 255, select: false })
  contrasena!: string;

  @Column({ name: 'cedula', type: 'varchar', length: 20, unique: true })
  cedula!: string;

  @Column({ name: 'imagen_usuario', type: 'varchar', length: 255, nullable: true })
  imagenUsuario!: string | null;

  @Column({ name: 'rol', type: 'enum', enum: Rol, enumName: 'rol_enum', default: Rol.Usuario })
  rol!: Rol;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoUsuario,
    enumName: 'estado_usuario_enum',
    default: EstadoUsuario.Pendiente,
  })
  estado!: EstadoUsuario;

  @Column({ name: 'puntos', type: 'int', default: 0 })
  puntos!: number;

  @Column({ name: 'retos_cumplidos', type: 'int', default: 0 })
  retosCumplidos!: number;

  @Column({ name: 'nivel', type: 'int', default: 0 })
  nivel!: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => GustoUsuario, (gustoUsuario) => gustoUsuario.usuario)
  gustosUsuario!: GustoUsuario[];
}
