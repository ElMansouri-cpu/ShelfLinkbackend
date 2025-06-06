import { Test, TestingModule } from '@nestjs/testing';
import { VariantSearchService } from '../variant-search.service';

describe('VariantSearchService', () => {
  let service: VariantSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VariantSearchService],
    }).compile();

    service = module.get<VariantSearchService>(VariantSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
