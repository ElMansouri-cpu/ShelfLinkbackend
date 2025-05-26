import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ReturnOrder } from './return-order.entity';
import { Variant } from '../../products/entities/variant.entity';

@Entity('return_order_items')
export class ReturnOrderItem extends BaseEntity {
  @Column()
  returnOrderId: string;

  @Column()
  variantId: string;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  returnReason: string;

  @ManyToOne(() => ReturnOrder, (returnOrder) => returnOrder.items)
  @JoinColumn({ name: 'returnOrderId' })
  returnOrder: ReturnOrder;

  @ManyToOne(() => Variant)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;
} 