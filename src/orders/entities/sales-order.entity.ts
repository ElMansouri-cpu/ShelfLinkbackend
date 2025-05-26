import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  orderNumber: string;

  @Column()
  status: string; // PENDING, PROCESSING, COMPLETED, CANCELLED

  @Column('decimal', { precision: 12, scale: 3 })
  totalAmount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  orderDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 