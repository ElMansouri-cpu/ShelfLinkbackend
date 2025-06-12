import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { BaseSearchService } from '../../common/services/base-search.service';
import { CacheEvict, Cacheable } from '../../cache/decorators';

@Injectable()
export class ProviderSearchService extends BaseSearchService<Provider> {
  protected readonly index = 'providers';
  protected readonly searchFields = [
    'name',
    'email',
    'phoneNumber',
    'address',
    'store.name'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {
    super(esService);
    this.createIndexIfNotExists().catch(error => {
      console.error('Failed to create index:', error);
    });
  }

  protected async flattenEntity(provider: Provider): Promise<any> {
    return {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      address: provider.address,
      image: provider.image,
      location: provider.location,
      storeId: provider.storeId,
      userId: provider.userId,
      contactInfo: provider.contactInfo,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:providers:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    await this.recreateIndex();
    const providers = await this.providerRepository.find({
      where: { storeId },
      relations: ['store'],
    });

    await this.bulkIndex(providers);
  }

  async searchEntities(query: string, filters: Record<string, any> = {}) {
    const { page = 1, limit = 50, ...cleanFilters } = filters;
    const from = (Number(page) - 1) * Number(limit);

    const mustFilters = Object.entries(cleanFilters).map(([key, val]) => ({
      match: { [key]: val },
    }));

    const shouldQuery = query?.trim()
      ? [
          // Multi-match for fuzzy text search
          {
            multi_match: {
              query,
              fields: [
                'name^3',           // Boost name matches
                'email^2',          // Boost email matches
                'phoneNumber^2',    // Boost phone number matches
                'address',          // Regular address matches
                'store.name^2',     // Boost store name matches
              ],
              type: 'best_fields' as const,
              fuzziness: 'AUTO',
              operator: 'or' as const,
              minimum_should_match: '2<75%',
              tie_breaker: 0.3
            }
          },
          // Wildcard query for substring matching
          {
            bool: {
              should: [
                { wildcard: { name: { value: `*${query}*` } } },
                { wildcard: { email: { value: `*${query}*` } } },
                { wildcard: { phoneNumber: { value: `*${query}*` } } },
                { wildcard: { address: { value: `*${query}*` } } },
                { wildcard: { 'store.name': { value: `*${query}*` } } }
              ],
              minimum_should_match: 1
            }
          }
        ]
      : [];

    const queryBody = shouldQuery.length
      ? {
          bool: {
            should: shouldQuery,
            filter: mustFilters,
            minimum_should_match: 1
          },
        }
      : mustFilters.length
      ? {
          bool: {
            filter: mustFilters,
          },
        }
      : {
          match_all: {},
        };

    const response = await this.esService.search({
      index: this.index,
      from,
      size: Number(limit),
      query: queryBody,
      sort: [
        { _score: { order: 'desc' } },  // Sort by relevance first
        { 'name.keyword': { order: 'asc' } }  // Then alphabetically by name
      ]
    });

    // Transform to simplified response format
    const total = typeof response.hits.total === 'number' 
      ? response.hits.total 
      : response.hits.total?.value || 0;

    const totalPages = Math.ceil(total / Number(limit));

    return {
      data: response.hits.hits.map((hit: any) => hit._source),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1,
      },
    };
  }
} 