import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Participacion } from '../../participaciones/entities/participacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Reto } from './reto.entity';

@Entity('retos_participantes')
export class RetoParticipante {
  @PrimaryGeneratedColumn('increment', { name: 'id_retos_participantes' })
  idRetosParticipantes!: number;

  @Column({ name: 'id_reto', type: 'int' })
  idReto!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @Column({ name: 'num_participacion', type: 'int', default: 1 })
  numParticipacion!: number;

  @ManyToOne(() => Reto, (reto) => reto.participantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_reto' })
  reto!: Reto;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @OneToMany(() => Participacion, (participacion) => participacion.retoParticipante)
  participaciones!: Participacion[];
}
