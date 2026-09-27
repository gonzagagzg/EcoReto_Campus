import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GustoUsuario } from './gusto_usuario.entity';

@Entity('gustos')
export class Gusto {
  @PrimaryGeneratedColumn('increment', { name: 'id_gusto' })
  idGusto!: number;

  @Column({ name: 'nombre_gusto', type: 'varchar', length: 100 })
  nombreGusto!: string;

  @Column({ name: 'imagen_gusto', type: 'varchar', length: 255, nullable: true })
  imagenGusto!: string | null;

  @OneToMany(() => GustoUsuario, (gustoUsuario) => gustoUsuario.gusto)
  usuariosGusto!: GustoUsuario[];
}
