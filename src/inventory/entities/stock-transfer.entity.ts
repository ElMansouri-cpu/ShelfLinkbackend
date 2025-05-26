import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Variant } from '../../products/entities/variant.entity';

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceStoreId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'sourceStoreId' })
  sourceStore: Store;

  @Column()
  destinationStoreId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'destinationStoreId' })
  destinationStore: Store;

  @Column()
  variantId: string;

  @ManyToOne(() => Variant)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;

  @Column()
  quantity: number;

  @Column()
  status: string; // PENDING, IN_TRANSIT, COMPLETED, CANCELLED

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transferDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  receivedDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 