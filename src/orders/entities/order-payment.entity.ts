import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('order_payments')
export class OrderPayment extends BaseEntity {
  @Column()
  orderId: string;

  @Column()
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  // @ManyToOne(() => Order, (order) => order.payments)
  // @JoinColumn({ name: 'orderId' })
  // order: Order;
} 