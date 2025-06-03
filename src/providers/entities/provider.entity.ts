import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phoneNumber: string;

  @Column('point')
  location: string; // Supabase will handle this as a PostGIS point

  @Column()
  email: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  storeId: string;

  @Column()
  userId: string;

  @Column('jsonb', { nullable: true })
  contactInfo: any;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;


} 