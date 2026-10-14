import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('soporte')
export class Soporte {
  @PrimaryGeneratedColumn('increment', { name: 'id_soporte' })
  idSoporte!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @Column({ name: 'nombre_soporte', type: 'varchar', length: 150 })
  nombreSoporte!: string;

  @Column({ name: 'detalle_soporte', type: 'text' })
  detalleSoporte!: string;

  @Column({ name: 'respuesta_soporte', type: 'text', nullable: true })
  respuestaSoporte!: string | null;

  @Column({ name: 'imagenes_soporte', type: 'varchar', length: 255, nullable: true })
  imagenesSoporte!: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @Column({ name: 'fecha_atencion', type: 'timestamptz', nullable: true })
  fechaAtencion!: Date | null;

  @Column({
    name: 'estado_soporte',
    type: 'enum',
    enum: EstadoEvaluacion,
    enumName: 'estado_soporte_enum',
    default: EstadoEvaluacion.Enviado,
  })
  estadoSoporte!: EstadoEvaluacion;

  @Column({ name: 'id_revisor_s', type: 'int', nullable: true })
  idRevisorS!: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_revisor_s' })
  revisor!: Usuario | null;
}
