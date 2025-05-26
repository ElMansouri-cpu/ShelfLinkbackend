import { Controller } from '@nestjs/common';
import { StoreCrudController } from '../../common/controllers/store-crud.controller';
import { VariantPromotionsService } from '../services/variant-promotions.service';
import { VariantPromotion } from '../entities/variant-promotion.entity';
import { CreateVariantPromotionDto } from '../dto/create-variant-promotion.dto';
import { UpdateVariantPromotionDto } from '../dto/update-variant-promotion.dto';

@Controller('stores/:storeId/products/:variantId/promotions')
export class VariantPromotionsController extends StoreCrudController<VariantPromotion, CreateVariantPromotionDto, UpdateVariantPromotionDto> {
  constructor(protected readonly service: VariantPromotionsService) {
    super(service);
  }
} 