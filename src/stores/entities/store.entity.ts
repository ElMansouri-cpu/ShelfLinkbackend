import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Brand } from '../../brands/entities/brand.entity';
import { Variant } from '../../products/entities/variant.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  banner: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  location: {
    lat: number;
    lng: number;
    address: string;
  };

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: 0 })
  productsCount: number;

  @Column({ default: 0 })
  ordersCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActive: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'maintenance'],
    default: 'active'
  })
  status: 'active' | 'maintenance';

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Category, category => category.store)
  categories: Category[];

  @OneToMany(() => Brand, brand => brand.store)
  brands: Brand[];

  @OneToMany(() => Variant, variant => variant.store)
  variants: Variant[];




  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 