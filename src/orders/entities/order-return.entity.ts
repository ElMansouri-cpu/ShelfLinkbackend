import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('order_returns')
export class OrderReturn extends BaseEntity {
  @Column()
  orderId: string;

  @Column({ type: 'text', nullable: true })
  returnReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  returnDate: Date;

  @Column({ default: 'pending' })
  status: string;

  // @ManyToOne(() => Order, (order) => order.returns)
  // @JoinColumn({ name: 'orderId' })
  // order: Order;
} 