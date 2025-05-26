import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Variant } from './variant.entity';

@Entity('variant_promotions')
export class VariantPromotion extends BaseEntity {
  @Column()
  variantId: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  discountPercentage: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @ManyToOne(() => Variant, (variant) => variant.promotions)
  @JoinColumn({ name: 'variantId' })
  variant: Variant;
} 