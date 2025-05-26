import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';

// @Entity('order_shipments')
export class OrderShipment extends BaseEntity {
  @Column()
  orderId: string;

  @Column()
  carrier: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  shipmentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ default: 'pending' })
  status: string;

  // @ManyToOne(() => Order, (order) => order.shipments)
  // @JoinColumn({ name: 'orderId' })
  // order: Order;
} 