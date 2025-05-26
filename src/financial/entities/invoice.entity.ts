import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { PaymentVoucher } from './payment-voucher.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  invoiceNumber: string;

  @Column('decimal', { precision: 12, scale: 3 })
  amount: number;

  @Column()
  status: string; // PENDING, PAID, CANCELLED

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  invoiceDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => PaymentVoucher, pv => pv.invoice)
  paymentVouchers: PaymentVoucher[];
} 