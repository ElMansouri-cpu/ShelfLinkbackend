import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 0 })
  productsCount: number;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, store => store.brands)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 