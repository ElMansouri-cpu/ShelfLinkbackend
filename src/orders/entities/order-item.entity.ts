import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';
import { Variant } from '../../products/entities/variant.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column()
  orderId: string;

  @Column()
  variantId: string;

  @Column()
  quantity: number;

  // @Column({ type: 'decimal', precision: 10, scale: 2 })
  // unitPrice: number;

  // @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  // discountAmount: number;

  // @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  // taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Variant)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;
} 