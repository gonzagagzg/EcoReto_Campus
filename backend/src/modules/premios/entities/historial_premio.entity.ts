import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Premio } from './premio.entity';

@Entity('historial_premios')
export class HistorialPremio {
  @PrimaryGeneratedColumn('increment', { name: 'id_historial_premio' })
  idHistorialPremio!: number;

  @Column({ name: 'id_premio', type: 'int' })
  idPremio!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @CreateDateColumn({ name: 'fecha_canje', type: 'timestamp' })
  fechaCanje!: Date;

  @ManyToOne(() => Premio, (premio) => premio.canjes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_premio' })
  premio!: Premio;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;
}
