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

  @Column({ name: 'imagenes_soporte', type: 'varchar', length: 255, nullable: true })
  imagenesSoporte!: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion!: Date;

  @Column({ name: 'fecha_atencion', type: 'timestamp', nullable: true })
  fechaAtencion!: Date | null;

  @Column({
    name: 'estado_soporte',
    type: 'enum',
    enum: EstadoEvaluacion,
    enumName: 'estado_evaluacion_enum',
    default: EstadoEvaluacion.Enviado,
  })
  estadoSoporte!: EstadoEvaluacion;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;
}
