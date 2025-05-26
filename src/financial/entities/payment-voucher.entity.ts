import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Invoice } from './invoice.entity';

@Entity('payment_vouchers')
export class PaymentVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ nullable: true })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  voucherNumber: string;

  @Column()
  payee: string;

  @Column('decimal', { precision: 12, scale: 3 })
  amount: number;

  @Column()
  paymentMethod: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 