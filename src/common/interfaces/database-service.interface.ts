import { IBaseEntity } from "./base-entity.interface";

export interface IDatabaseService<T extends IBaseEntity> {
    create(storeId: string, data: Partial<T>): Promise<T>;
    findById(storeId: string, id: string): Promise<T | null>;
    update(storeId: string, id: string, data: Partial<T>): Promise<T>;
    delete(storeId: string, id: string): Promise<boolean>;
    findMany(storeId: string, filters?: Record<string, any>): Promise<T[]>;
    checkAssociations(storeId: string, id: string): Promise<string[]>; // Returns array of association names
  }
  