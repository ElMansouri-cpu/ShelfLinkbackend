import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Variant } from '../../products/entities/variant.entity';
import { InventoryBatch } from './inventory-batch.entity';

@Entity('damaged_items')
export class DamagedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ nullable: true })
  inventoryBatchId: string;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'inventoryBatchId' })
  inventoryBatch: InventoryBatch;

  @Column()
  quantity: number;

  @Column()
  reason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  damageDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 