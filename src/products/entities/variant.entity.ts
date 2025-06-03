import { Entity, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { Tax } from './tax.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Brand } from 'src/brands/entities/brand.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Unit } from 'src/unit/entities/unit.entity';
@Entity('variants')
export class Variant extends BaseEntity {
  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  name: string;

  

  @Column()
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column()
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  sku: string;
  
  @Column({ type: 'text', nullable: true })
  image: string;
  
  @Column('numeric', { precision: 12, scale: 3 })
  buyPriceHt: number;

  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  buyDiscountPct: number;

  @Column('numeric', { precision: 12, scale: 3 })
  buyPriceNetHt: number;

  @Column('numeric', { precision: 12, scale: 3, nullable: true })
  buyPriceTtc: number;

  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  margePct: number;
  @Column('enum', { enum: ['percentage', 'currency'], default: 'percentage' })
  margeType: string;

  @Column('numeric', { precision: 12, scale: 3 })
  sellPriceHt: number;

  @Column('numeric', { precision: 12, scale: 3, nullable: true })
  sellPriceTtc: number;


  @Column({ type: 'text', nullable: true })
  description: string;



  @Column({ type: 'text', nullable: true })
  barcode: string;


  @Column({ nullable: true })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ nullable: true })
  unitId: string;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @ManyToMany(() => Tax, tax => tax.variants)
  @JoinTable({
    name: 'variant_taxes',
    joinColumn: { name: 'variant_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tax_id', referencedColumnName: 'id' }
  })
  taxes: Tax[];



} 