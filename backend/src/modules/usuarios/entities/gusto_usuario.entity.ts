import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gusto } from './gusto.entity';
import { Usuario } from './usuario.entity';

@Entity('gustos_usuario')
export class GustoUsuario {
  @PrimaryGeneratedColumn('increment', { name: 'id_gusto_usuario' })
  idGostoUsuario!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @Column({ name: 'id_gusto', type: 'int' })
  idGusto!: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.gustosUsuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @ManyToOne(() => Gusto, (gusto) => gusto.usuariosGusto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_gusto' })
  gusto!: Gusto;
}
