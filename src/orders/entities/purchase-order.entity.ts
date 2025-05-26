import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Provider, prov => prov.purchaseOrders)
  provider: Provider;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  orderDate: Date;

  @Column({ default: 'pending' })
  status: string;

  @Column('numeric', { precision: 12, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 