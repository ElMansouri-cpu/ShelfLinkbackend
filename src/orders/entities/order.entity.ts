import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { OrderItem } from './order-item.entity';
import { OrderPayment } from './order-payment.entity';
import { OrderShipment } from './order-shipment.entity';
import { OrderReturn } from './order-return.entity';
import { User } from 'src/users/entities/user.entity';

export enum Status {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
  COMPLETED = 'completed'
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup'
}

// export enum PaymentMethod {
//   CASH = 'cash',
//   CREDIT = 'credit_card',
//   DEBIT_CARD = 'debit_card',
//   PAYPAL = 'paypal',
//   STRIPE = 'stripe'
// }


@Entity('orders')
export class Order extends BaseEntity {
  // @Column()
  // orderNumber: string;
  @Column()
  userId: string;

  @Column()
  storeId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DELIVERY })
  orderType: OrderType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  //add order distination or location map 
  @Column()
  destination: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  longitude: number;



  // @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  // discountAmount: number;

  // @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  // taxAmount: number;

  // @Column({ type: 'decimal', precision: 10, scale: 2 })
  // netAmount: number;

  @Column({ type: 'enum', enum: Status, default: Status.PENDING })
  status: Status;

  @Column({ type: 'timestamp', nullable: true })
  orderDate: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  // @OneToMany(() => OrderPayment, (payment) => payment.order)
  // payments: OrderPayment[];

  // @OneToMany(() => OrderShipment, (shipment) => shipment.order)
  // shipments: OrderShipment[];

  // @OneToMany(() => OrderReturn, (return_) => return_.order)
  // returns: OrderReturn[];
} 