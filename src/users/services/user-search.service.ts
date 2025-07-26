import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserSearchService extends BaseSearchService<User> implements OnModuleInit {
  protected readonly indexName = 'users';
  protected readonly searchFields = ['username', 'email', 'subscriptionTier'];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing user search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('User search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize user search service:', error);
      console.log('User search service will be available but may need manual reindexing');
    }
  }

  public async createIndexIfNotExists() {
    try {
      const indexExists = await this.esService.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        await this.esService.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                filter: {
                  autocomplete_filter: {
                    type: 'edge_ngram',
                    min_gram: 1,
                    max_gram: 20
                  }
                },
                analyzer: {
                  autocomplete: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: [
                      'lowercase',
                      'autocomplete_filter'
                    ]
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: {
                  type: 'keyword'
                },
                username: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                email: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                phone: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256
                    }
                  }
                },
                role: {
                  type: 'keyword'
                },
                storeLimit: {
                  type: 'integer'
                },
                subscriptionTier: {
                  type: 'keyword'
                },
                user_metadata: {
                  type: 'object'
                },
                app_metadata: {
                  type: 'object'
                },
                createdAt: {
                  type: 'date'
                },
                updatedAt: {
                  type: 'date'
                }
              }
            }
          }
        });
        console.log(`Created index ${this.indexName} with proper mapping`);
      }
    } catch (error) {
      console.error(`Failed to create index ${this.indexName}:`, error);
      throw error;
    }
  }

  // --- Aliased/Implemented Generic Methods ---

  /**
   * Index (or update) a user in Elasticsearch
   */
  async index(user: User) {
    return this.indexEntity(user);
  }

  /**
   * Search for users by query/filter
   */
  async search(storeId: string, query: any) {
    // Implement custom search logic for users
    const searchQuery = query.q || '';
    const filters = { ...query };
    
    const must: any[] = [];

    if (searchQuery) {
      must.push({
        multi_match: {
          query: searchQuery,
          fields: this.searchFields,
          fuzziness: 'AUTO'
        }
      });
    }

    // Add additional filters
    if (filters.role) {
      must.push({ term: { role: filters.role } });
    }
    if (filters.subscriptionTier) {
      must.push({ term: { subscriptionTier: filters.subscriptionTier } });
    }

    const response = await this.esService.search({
      index: this.indexName,
      body: {
        query: {
          bool: { must }
        },
        sort: [{ createdAt: { order: 'desc' } }]
      }
    });

    return {
      hits: response.hits.hits.map((hit: any) => hit._source),
      total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0
    };
  }

  /**
   * Find a single user by ID
   */
  async findById(storeId: string, id: string) {
    return super.findById(storeId, id);
  }

  /**
   * Update a user in Elasticsearch
   */
  async update(user: User) {
    return this.indexEntity(user);
  }

  /**
   * Remove a user from Elasticsearch by ID
   */
  async remove(storeId: string, id: string) {
    return this.removeEntity(id);
  }

  // --- Entity-Specific Methods ---

  private async reindexAll() {
    try {
      const users = await this.userRepository.find({
        relations: ['stores'],
      });

      if (users.length === 0) {
        console.log('No users found for reindexing');
        return;
      }

      // Delete existing index if it exists
      try {
        await this.esService.indices.delete({ index: this.indexName });
        console.log(`Deleted existing index ${this.indexName}`);
      } catch (error) {
        // Ignore error if index doesn't exist
      }

      await this.createIndexIfNotExists();
      console.log(`Created fresh index ${this.indexName}`);

      const operations: any[] = [];
      for (const user of users) {
        const flattenedEntity = await this.flattenEntity(user);
        operations.push({ index: { _index: this.indexName, _id: user.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${users.length} users`);
      }
    } catch (error) {
      console.error('Failed to reindex users:', error);
      throw error;
    }
  }

  protected async flattenEntity(user: User): Promise<any> {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      storeLimit: user.storeLimit,
      subscriptionTier: user.subscriptionTier,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    try {
      // Users are not directly tied to stores, but we can reindex users who own the store
      const users = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.stores', 'store', 'store.id = :storeId', { storeId })
        .getMany();

      // Delete existing documents for these users
      if (users.length > 0) {
        const userIds = users.map(user => user.id);
        await this.esService.deleteByQuery({
          index: this.indexName,
          body: { query: { terms: { id: userIds } } }
        });
      }

      // Index new documents
      const operations: any[] = [];
      for (const user of users) {
        const flattenedEntity = await this.flattenEntity(user);
        operations.push({ index: { _index: this.indexName, _id: user.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${users.length} users for store ${storeId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex users for store ${storeId}:`, error);
      throw error;
    }
  }

  async reindexByUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.indexEntity(user);
        console.log(`Reindexed user ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex user ${userId}:`, error);
      throw error;
    }
  }

  async debugIndex() {
    try {
      const indexExists = await this.esService.indices.exists({ index: this.indexName });
      console.log(`Index ${this.indexName} exists:`, indexExists);

      if (indexExists) {
        const count = await this.esService.count({ index: this.indexName });
        console.log(`Document count:`, count);

        const sample = await this.esService.search({
          index: this.indexName,
          size: 5,
          query: { match_all: {} }
        });
        console.log(`Sample documents:`, sample.hits.hits.map(hit => hit._source));
      }
    } catch (error) {
      console.error('Failed to debug index:', error);
    }
  }
} 