export interface ISearchService<T> {
  /**
   * Index (or update) an entity in Elasticsearch.
   */
  index(entity: T): Promise<any>;

  /**
   * Search for entities by store and query/filter.
   */
  search(storeId: string, query: any): Promise<any>;

  /**
   * Find a single entity by store and ID.
   */
  findById(storeId: string, id: string): Promise<T | null>;

  /**
   * Update an entity in Elasticsearch.
   */
  update(entity: T): Promise<any>;

  /**
   * Remove an entity from Elasticsearch by store and ID.
   */
  remove(storeId: string, id: string): Promise<any>;
}
  