import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { Brand } from '../../brands/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { Variant } from './variant.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image: string;

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


} 