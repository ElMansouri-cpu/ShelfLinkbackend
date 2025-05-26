import { Entity, Column, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Variant } from './variant.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('taxes')
export class Tax extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @ManyToMany(() => Variant, variant => variant.taxes)
  variants: Variant[];
} 