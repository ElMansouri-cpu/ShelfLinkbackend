import { IBaseEntity } from "./base-entity.interface";
import { IOperationResult } from "./operation-result.interface";
import { IPaginatedResponse } from "./paginated-response.interface";
import { IQueryParams } from "./query-params.interface";

export interface IEntityService<T, CreateDto, UpdateDto> {
  /**
   * Create a new entity in the store.
   */
  create(storeId: string, dto: CreateDto): Promise<T>;

  /**
   * Fetch or search entities for a store, with optional filters.
   */
  findAll(storeId: string, query: any): Promise<T[]>;

  /**
   * Fetch a single entity by ID from a store.
   */
  findOne(storeId: string, id: string): Promise<T>;

  /**
   * Update an entity by ID in a store.
   */
  update(storeId: string, id: string, dto: UpdateDto): Promise<T>;

  /**
   * Delete an entity by ID from a store.
   */
  delete(storeId: string, id: string): Promise<void>;

  /**
   * Check if the entity has associations that prevent deletion.
   */
  checkAssociations(storeId: string, id: string): Promise<boolean>;

  /**
   * Health check for monitoring.
   */
  healthCheck(): Promise<any>;

  /**
   * Get metrics for monitoring.
   */
  getMetrics(): Promise<any>;
}
  