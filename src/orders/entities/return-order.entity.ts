import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { Order } from './order.entity';
import { ReturnOrderItem } from './return-order-item.entity';

@Entity('return_orders')
export class ReturnOrder extends BaseEntity {
  @Column()
  returnNumber: string;

  @Column()
  storeId: string;

  @Column()
  orderId: string;

  @Column({ type: 'text', nullable: true })
  returnReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  returnDate: Date;

  @Column({ default: 'pending' })
  status: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToMany(() => ReturnOrderItem, (item) => item.returnOrder)
  items: ReturnOrderItem[];
} 