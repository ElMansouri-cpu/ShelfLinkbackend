import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Variant } from '../../products/entities/variant.entity';
import { DamagedItem } from './damaged-item.entity';

@Entity('inventory_batches')
export class InventoryBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  variantId: string;

  @ManyToOne(() => Variant)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;

  @Column()
  batchNumber: string;

  @Column({ default: 0 })
  quantityTotal: number;

  @Column({ default: 0 })
  quantityReserved: number;

  @Column({ type: 'integer', generatedType: 'STORED', asExpression: `("quantityTotal" - "quantityReserved")` })
  quantityAvailable: number;

  @Column({ type: 'timestamp' })
  expiryDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => DamagedItem, di => di.inventoryBatch)
  damagedItems: DamagedItem[];
} 