import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Variant } from './variant.entity';

@Entity('variant_special_prices')
export class VariantSpecialPrice extends BaseEntity {
  @Column()
  variantId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @ManyToOne(() => Variant, (variant) => variant.specialPrices)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;
} 