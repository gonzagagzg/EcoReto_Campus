import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { RetoParticipante } from './reto_participante.entity';

export enum Dificultad {
  Facil = 'Fácil',
  Medio = 'Medio',
  Dificil = 'Difícil',
}

export enum EstadoReto {
  PendienteAprobacion = 'Pendiente_Aprobacion',
  Activo = 'Activo',
  Finalizado = 'Finalizado',
  Bloqueado = 'Bloqueado',
  /** Rechazado por el staff: no se muestra en el feed del campus. */
  Negado = 'Negado',
  /** Baja logica: quitado del catalogo sin borrar sus participaciones. */
  Desactivado = 'Desactivado',
}

@Entity('retos')
@Check('chk_fecha_limite', 'fecha_limite > fecha_creacion')
export class Reto {
  @PrimaryGeneratedColumn('increment', { name: 'id_reto' })
  idReto!: number;

  @Column({ name: 'id_usuario_creador', type: 'int' })
  idUsuarioCreador!: number;

  @Column({ name: 'nombre_reto', type: 'varchar', length: 150 })
  nombreReto!: string;

  @Column({ name: 'imagen_reto', type: 'varchar', length: 255, nullable: true })
  imagenReto!: string | null;

  @Column({ name: 'descripcion_reto', type: 'text' })
  descripcionReto!: string;

  @Column({ name: 'categoria', type: 'varchar', length: 100 })
  categoria!: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion!: Date;

  @Column({ name: 'fecha_limite', type: 'timestamp' })
  fechaLimite!: Date;

  @Column({
    name: 'dificultad',
    type: 'enum',
    enum: Dificultad,
    enumName: 'dificultad_enum',
  })
  dificultad!: Dificultad;

  @Column({ name: 'puntos_completado', type: 'int', default: 0 })
  puntosCompletado!: number;

  @Column({ name: 'puntos_participar', type: 'int', default: 0 })
  puntosParticipar!: number;

  @Column({
    name: 'estado_reto',
    type: 'enum',
    enum: EstadoReto,
    enumName: 'estado_reto_enum',
    default: EstadoReto.PendienteAprobacion,
  })
  estadoReto!: EstadoReto;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario_creador' })
  creador!: Usuario;

  @OneToMany(() => RetoParticipante, (participante) => participante.reto)
  participantes!: RetoParticipante[];
}
