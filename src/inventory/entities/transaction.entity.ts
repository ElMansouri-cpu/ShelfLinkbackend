import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Variant } from '../../products/entities/variant.entity';

@Entity('inventory_transactions')
export class Transaction {
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

  @Column()
  type: string; // IN, OUT, ADJUSTMENT

  @Column()
  quantity: number;

  @Column({ nullable: true })
  reference: string; // Reference to order, transfer, etc.

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 