import { Injectable } from '@nestjs/common';
import { BrandSearchService } from '../../brands/services/brand-search.service';
import { CategorySearchService } from '../../categories/services/category-search.service';
import { OrderSearchService } from '../../orders/services/order-search.service';
import { UnitSearchService } from '../../unit/services/unit-search.service';
import { TaxSearchService } from '../../products/services/tax-search.service';
import { UserSearchService } from '../../users/services/user-search.service';
import { VariantSearchService } from '../../products/services/variant-search.service';

@Injectable()
export class SearchManagerService {
  constructor(
    private readonly brandSearchService: BrandSearchService,
    private readonly categorySearchService: CategorySearchService,
    private readonly orderSearchService: OrderSearchService,
    private readonly unitSearchService: UnitSearchService,
    private readonly taxSearchService: TaxSearchService,
    private readonly userSearchService: UserSearchService,
    private readonly variantSearchService: VariantSearchService,
  ) {}

  /**
   * Reindex all entities for a specific store
   */
  async reindexStore(storeId: string): Promise<void> {
    await Promise.all([
      this.brandSearchService.reindexByStore(storeId),
      this.categorySearchService.reindexByStore(storeId),
      this.orderSearchService.reindexByStore(storeId),
      this.unitSearchService.reindexByStore(storeId),
      this.taxSearchService.reindexByStore(storeId),
      this.userSearchService.reindexByStore(storeId),
      this.variantSearchService.reindexVariantsByStore(storeId),
    ]);
  }

  /**
   * Reindex all entities for a specific user
   */
  async reindexUser(userId: string): Promise<void> {
    await Promise.all([
      this.orderSearchService.reindexByUser?.(userId),
      this.userSearchService.reindexByUser?.(userId),
    ].filter(Boolean));
  }

  /**
   * Global search across all entities for a store
   */
  async globalSearch(storeId: string, query: string, limit: number = 10) {
    const results = await Promise.allSettled([
      this.brandSearchService.searchEntities(query, { storeId, limit }),
      this.categorySearchService.searchEntities(query, { storeId, limit }),
      this.orderSearchService.searchEntities(query, { storeId, limit }),
      this.unitSearchService.searchEntities(query, { storeId, limit }),
      this.taxSearchService.searchEntities(query, { storeId, limit }),
      this.variantSearchService.searchVariants(query, { storeId, limit }),
    ]);

    return {
      brands: results[0].status === 'fulfilled' ? results[0].value : { hits: [], total: 0 },
      categories: results[1].status === 'fulfilled' ? results[1].value : { hits: [], total: 0 },
      orders: results[2].status === 'fulfilled' ? results[2].value : { hits: [], total: 0 },
      units: results[3].status === 'fulfilled' ? results[3].value : { hits: [], total: 0 },
      taxes: results[4].status === 'fulfilled' ? results[4].value : { hits: [], total: 0 },
      variants: results[5].status === 'fulfilled' ? results[5].value : { hits: [], total: 0 },
    };
  }
} 