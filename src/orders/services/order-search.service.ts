import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderSearchService extends BaseSearchService<Order> implements OnModuleInit {
  protected readonly indexName = 'orders';
  protected readonly searchFields = [
    'id^3',
    'status^2',
    'user.username^3',
    'user.email^2',
    'store.name^2',
    'destination^2'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      console.log('Initializing order search service...');
      await this.createIndexIfNotExists();
      await this.reindexAll();
      console.log('Order search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize order search service:', error);
      console.log('Order search service will be available but may need manual reindexing');
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
                status: {
                  type: 'keyword'
                },
                totalAmount: {
                  type: 'float'
                },
                orderType: {
                  type: 'keyword'
                },
                destination: {
                  type: 'text',
                  analyzer: 'autocomplete',
                  search_analyzer: 'standard'
                },
                latitude: {
                  type: 'float'
                },
                longitude: {
                  type: 'float'
                },
                orderDate: {
                  type: 'date'
                },
                storeId: {
                  type: 'keyword'
                },
                userId: {
                  type: 'keyword'
                },
                store: {
                  properties: {
                    id: {
                      type: 'keyword'
                    },
                    name: {
                      type: 'text',
                      analyzer: 'autocomplete',
                      search_analyzer: 'standard'
                    },
                    logo: {
                      type: 'keyword'
                    },
                    url: {
                      type: 'keyword'
                    },
                    status: {
                      type: 'keyword'
                    }
                  }
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword'
                    },
                    username: {
                      type: 'text',
                      analyzer: 'autocomplete',
                      search_analyzer: 'standard'
                    },
                    email: {
                      type: 'keyword'
                    }
                  }
                },
                items: {
                  type: 'nested',
                  properties: {
                    id: {
                      type: 'keyword'
                    },
                    quantity: {
                      type: 'integer'
                    },
                    totalAmount: {
                      type: 'float'
                    },
                    variant: {
                      properties: {
                        id: {
                          type: 'keyword'
                        },
                        name: {
                          type: 'text',
                          analyzer: 'autocomplete',
                          search_analyzer: 'standard'
                        },
                        sku: {
                          type: 'keyword'
                        }
                      }
                    }
                  }
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
   * Index (or update) an order in Elasticsearch
   */
  async index(order: Order) {
    return this.indexEntity(order);
  }

  /**
   * Search for orders by store and query/filter
   */
  async search(storeId: string, query: any) {
    const searchQuery = query.q || '';
    const filters = { ...query };
    
    const must: any[] = [
      { term: { storeId } }
    ];

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
    if (filters.status) {
      must.push({ term: { status: filters.status } });
    }
    if (filters.orderType) {
      must.push({ term: { orderType: filters.orderType } });
    }
    if (filters.userId) {
      must.push({ term: { userId: filters.userId } });
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
   * Find a single order by store and ID
   */
  async findById(storeId: string, id: string) {
    return super.findById(storeId, id);
  }

  /**
   * Update an order in Elasticsearch
   */
  async update(order: Order) {
    return this.indexEntity(order);
  }

  /**
   * Remove an order from Elasticsearch by store and ID
   */
  async remove(storeId: string, id: string) {
    return this.removeEntity(id);
  }

  // --- Entity-specific methods ---

  private async reindexAll() {
    try {
      const orders = await this.orderRepository.find({
        relations: ['store', 'user', 'items', 'items.variant'],
      });

      if (orders.length === 0) {
        console.log('No orders found for reindexing');
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
      for (const order of orders) {
        const flattenedEntity = await this.flattenEntity(order);
        operations.push({ index: { _index: this.indexName, _id: order.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${orders.length} orders`);
      }
    } catch (error) {
      console.error('Failed to reindex orders:', error);
      throw error;
    }
  }

  protected async flattenEntity(order: Order): Promise<any> {
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      orderType: order.orderType,
      destination: order.destination,
      latitude: order.latitude,
      longitude: order.longitude,
      orderDate: order.orderDate,
      storeId: order.storeId,
      userId: order.userId,
      
      store: order.store ? {
        id: order.store.id,
        name: order.store.name,
        logo: order.store.logo,
        url: order.store.url,
        status: order.store.status,
      } : null,
      
      user: order.user ? {
        id: order.user.id,
        username: order.user.username,
        email: order.user.email,
      } : null,
      
      items: order.items?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku,
        } : null,
      })) || [],
      
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async reindexByStore(storeId: string): Promise<void> {
    try {
      const orders = await this.orderRepository.find({
        where: { storeId },
        relations: ['store', 'user', 'items', 'items.variant'],
      });

      if (orders.length === 0) {
        console.log(`No orders found for store ${storeId}`);
        return;
      }

      // Delete existing documents for this store
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: { query: { term: { storeId } } }
      });

      // Index new documents
      const operations: any[] = [];
      for (const order of orders) {
        const flattenedEntity = await this.flattenEntity(order);
        operations.push({ index: { _index: this.indexName, _id: order.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${orders.length} orders for store ${storeId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex orders for store ${storeId}:`, error);
      throw error;
    }
  }

  async reindexByUser(userId: string): Promise<void> {
    try {
      const orders = await this.orderRepository.find({
        where: { userId },
        relations: ['store', 'user', 'items', 'items.variant'],
      });

      if (orders.length === 0) {
        console.log(`No orders found for user ${userId}`);
        return;
      }

      // Delete existing documents for this user
      await this.esService.deleteByQuery({
        index: this.indexName,
        body: { query: { term: { userId } } }
      });

      // Index new documents
      const operations: any[] = [];
      for (const order of orders) {
        const flattenedEntity = await this.flattenEntity(order);
        operations.push({ index: { _index: this.indexName, _id: order.id } });
        operations.push(flattenedEntity);
      }

      if (operations.length > 0) {
        await this.esService.bulk({ body: operations, refresh: true });
        console.log(`Reindexed ${orders.length} orders for user ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to reindex orders for user ${userId}:`, error);
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