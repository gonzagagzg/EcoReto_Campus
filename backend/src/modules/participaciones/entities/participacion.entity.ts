import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RetoParticipante } from '../../retos/entities/reto_participante.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoEvaluacion {
  Enviado = 'Enviado',
  Aprobado = 'Aprobado',
  Negado = 'Negado',
  Bloqueado = 'Bloqueado',
}

@Entity('participacion_reto')
export class Participacion {
  @PrimaryGeneratedColumn('increment', { name: 'id_participacion' })
  idParticipacion!: number;

  @Column({ name: 'id_retos_participantes', type: 'int' })
  idRetosParticipantes!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @Column({ name: 'imagen_evidencia', type: 'varchar', length: 255 })
  imagenEvidencia!: string;

  @Column({
    name: 'estado_participacion',
    type: 'enum',
    enum: EstadoEvaluacion,
    enumName: 'estado_evaluacion_enum',
    default: EstadoEvaluacion.Enviado,
  })
  estadoParticipacion!: EstadoEvaluacion;

  @Column({ name: 'id_usuario_revisor', type: 'int', nullable: true })
  idUsuarioRevisor!: number | null;

  @Column({ name: 'observacion_revision', type: 'text', nullable: true })
  observacionRevision!: string | null;

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision!: Date | null;

  /** Dias de cumplimiento sobre los dias estimados del reto. Base del pago proporcional 100% / 50%. */
  @Column({ name: 'dias_cumplidos', type: 'int', nullable: true })
  diasCumplidos!: number | null;

  @ManyToOne(() => RetoParticipante, (participante) => participante.participaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_retos_participantes' })
  retoParticipante!: RetoParticipante;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_usuario_revisor' })
  revisor!: Usuario | null;
}
