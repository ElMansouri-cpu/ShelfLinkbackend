import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { UserRole } from '../enums/role.enum';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Column({ default: 2 })
  storeLimit: number;

  @Column({ default: 'basic' })
  subscriptionTier: string;

  @Column({ type: 'jsonb', nullable: true })
  user_metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  app_metadata: Record<string, any>;

  @OneToMany(() => Store, store => store.user)
  stores: Store[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 