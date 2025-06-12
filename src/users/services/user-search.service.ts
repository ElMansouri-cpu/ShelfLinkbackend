import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BaseSearchService } from '../../common/services/base-search.service';
import { User } from '../entities/user.entity';
import { CacheEvict } from '../../cache/decorators';

@Injectable()
export class UserSearchService extends BaseSearchService<User> {
  protected readonly index = 'users';
  protected readonly searchFields = [
    'username',
    'email',
    'subscriptionTier'
  ];

  constructor(
    protected readonly esService: ElasticsearchService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(esService);
    this.createIndexIfNotExists().catch(error => {
      console.error('Failed to create index:', error);
    });
  }

  protected async flattenEntity(user: User): Promise<any> {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      storeLimit: user.storeLimit,
      user_metadata: user.user_metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @CacheEvict({
    patternGenerator: (storeId) => `search:users:*`,
  })
  async reindexByStore(storeId: string): Promise<void> {
    await this.recreateIndex();
    // Users are not directly tied to stores, but we can reindex users who own the store
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.stores', 'store', 'store.id = :storeId', { storeId })
      .getMany();

    await this.bulkIndex(users);
  }

  @CacheEvict({
    patternGenerator: (userId) => `search:users:*`,
  })
  async reindexByUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.indexEntity(user);
    }
  }
} 