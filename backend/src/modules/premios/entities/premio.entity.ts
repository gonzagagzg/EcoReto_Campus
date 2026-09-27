import { Check, Column, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { HistorialPremio } from './historial_premio.entity';

@Entity('premios')
@Check('premios_puntos_premio_check', 'puntos_premio >= 0')
export class Premio {
  @PrimaryGeneratedColumn('increment', { name: 'id_premio' })
  idPremio!: number;

  @Column({ name: 'nombre_premio', type: 'varchar', length: 150 })
  nombrePremio!: string;

  @Column({ name: 'descripcion_premio', type: 'text' })
  descripcionPremio!: string;

  @Column({ name: 'imagen_premio', type: 'varchar', length: 255, nullable: true })
  imagenPremio!: string | null;

  @Column({ name: 'puntos_premio', type: 'int' })
  puntosPremio!: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => HistorialPremio, (historial) => historial.premio)
  canjes!: HistorialPremio[];
}
