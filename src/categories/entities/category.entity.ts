import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Variant } from '../../products/entities/variant.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active'
  })
  status: 'active' | 'inactive';

  @Column({ default: 0 })
  productsCount: number;

  @Column({ nullable: true })
  parentId: number;

  @Column()
  storeId: string;

  @ManyToOne(() => Store, store => store.categories)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @ManyToOne(() => Category, category => category.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @OneToMany(() => Category, category => category.parent)
  children: Category[];

  @OneToMany(() => Variant, variant => variant.category)
  variants: Variant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 