// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Category } from './entities/category.entity';
// import { CreateCategoryDto } from './dto/create-category.dto';
// import { UpdateCategoryDto } from './dto/update-category.dto';
// import { StoresService } from '../stores/stores.service';
// import { QueryDto } from 'src/common/dto/query.dto';

// @Injectable()
// export class CategoriesService {
//   constructor(
//     @InjectRepository(Category)
//     private readonly categoryRepository: Repository<Category>,
//     private readonly storesService: StoresService,
//   ) {}

//   async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<Category> {
//     // Verify that the store belongs to the user
//     await this.storesService.findOne(createCategoryDto.storeId, userId);

//     // If parentId is provided, verify it exists and belongs to the same store
//     if (createCategoryDto.parentId) {
//       const parentCategory = await this.categoryRepository.findOne({
//         where: { id: createCategoryDto.parentId, storeId: createCategoryDto.storeId }
//       });
      
//       if (!parentCategory) {
//         throw new BadRequestException('Parent category not found or does not belong to the specified store');
//       }
//     }

//     // Create new category
//     const category = this.categoryRepository.create({
//       ...createCategoryDto,
//       productsCount: 0,
//     });

//     return this.categoryRepository.save(category);
//   }

//   async findAll(storeId: string, userId: string): Promise<Category[]> {
//     // Verify that the store belongs to the user
//     await this.storesService.findOne(storeId, userId);
    
//     return this.categoryRepository.find({
//       where: { storeId },
//       relations: ['parent', 'children'],
//       order: {
//         name: 'ASC',
//       },
//     });
//   }

//   async findOne(id: number, storeId: string, userId: string): Promise<Category> {
//     // Verify that the store belongs to the user
//     await this.storesService.findOne(storeId, userId);
    
//     const category = await this.categoryRepository.findOne({
//       where: { id, storeId },
//       relations: ['parent', 'children'],
//     });
    
//     if (!category) {
//       throw new NotFoundException('Category not found');
//     }
    
//     return category;
//   }

//   async update(id: number, updateCategoryDto: UpdateCategoryDto, storeId: string, userId: string): Promise<Category> {
//     const category = await this.findOne(id, storeId, userId);
    
//     // If storeId is being updated, verify the new store belongs to the user
//     if (updateCategoryDto.storeId && updateCategoryDto.storeId !== storeId) {
//       await this.storesService.findOne(updateCategoryDto.storeId, userId);
//     }
    
//     // If parentId is being updated, verify it exists and belongs to the same store
//     if (updateCategoryDto.parentId) {
//       const targetStoreId = updateCategoryDto.storeId || storeId;
//       const parentCategory = await this.categoryRepository.findOne({
//         where: { id: updateCategoryDto.parentId, storeId: targetStoreId }
//       });
      
//       if (!parentCategory) {
//         throw new BadRequestException('Parent category not found or does not belong to the specified store');
//       }
      
//       // Prevent circular references
//       if (updateCategoryDto.parentId === id) {
//         throw new BadRequestException('A category cannot be its own parent');
//       }
//     }
    
//     // Update category
//     Object.assign(category, updateCategoryDto);
    
//     return this.categoryRepository.save(category);
//   }

//   async remove(id: number, storeId: string, userId: string): Promise<void> {
//     const category = await this.findOne(id, storeId, userId);
    
//     // Check if category has children
//     const hasChildren = await this.categoryRepository.count({ where: { parentId: id } }) > 0;
//     if (hasChildren) {
//       throw new BadRequestException('Cannot delete category with subcategories. Please delete subcategories first.');
//     }
    
//     await this.categoryRepository.remove(category);
//   }

//   async updateProductsCount(id: number, storeId: string, userId: string, increment: boolean = true): Promise<Category> {
//     const category = await this.findOne(id, storeId, userId);
    
//     if (increment) {
//       category.productsCount += 1;
//     } else {
//       category.productsCount = Math.max(0, category.productsCount - 1);
//     }
    
//     return this.categoryRepository.save(category);
//   }

//   async queryCategories(dto: QueryDto) {
//     const qb = this.categoryRepository.createQueryBuilder('categorie');

//     // Filters
//     dto.filters.forEach((filter, index) => {
//       const paramKey = `filter_${index}`;
//       const column = `categorie.${filter.column}`;
//       let condition = '';
//       let value = filter.value;

//       switch (filter.operator) {
//         case 'contains':
//           condition = `${column} ILIKE :${paramKey}`;
//           value = `%${value}%`;
//           break;
//         case 'startsWith':
//           condition = `${column} ILIKE :${paramKey}`;
//           value = `${value}%`;
//           break;
//         case 'endsWith':
//           condition = `${column} ILIKE :${paramKey}`;
//           value = `%${value}`;
//           break;
//         case 'equals':
//           condition = `${column} = :${paramKey}`;
//           break;
//       }

//       qb.andWhere(condition, { [paramKey]: value });
//     });

//     // Sorting
//     dto.sorts.forEach((sort) => {
//       qb.addOrderBy(`categorie.${sort.column}`, sort.direction.toUpperCase() as 'ASC' | 'DESC');
//     });

//     return qb.getMany();
//   }

//   async textSearchCategories(
//     storeId: string,
//     search: string,
//     userId: string
//   ): Promise<Category[]> {
//     // Ensure store belongs to user
//     await this.storesService.findOne(storeId, userId);
  
//     const query = this.categoryRepository
//       .createQueryBuilder('category')
//       .where('category.storeId = :storeId', { storeId });
  
//     if (search?.trim()) {
//       const trimmed = search.trim();
//       query.andWhere(
//         `(category.name ILIKE :search OR category.description ILIKE :search)`,
//         { search: `%${trimmed}%` },
//       );
//     }
  
//     return query
//       .orderBy('category.createdAt', 'DESC')
//       .getMany();
//   }
//   }


// src/categories/categories.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StoreCrudService } from 'src/common/services/store-crud.service';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { StoresService } from '../stores/stores.service';
import { Order } from 'src/orders/entities/order.entity';

@Injectable()
export class CategoriesService extends StoreCrudService<Category> {
  protected readonly alias = 'categorie';
  protected readonly searchColumns: (keyof Category)[] = ['name', 'description'];

  constructor(
    @InjectRepository(Category) repo: Repository<Category>,
    storesService: StoresService,
  ) {
    super(repo, storesService);
  }

  
  async getProducts(id: string) {
    const category = await this.repo.findOne({ 
      where: { id: Number(id) } as any, 
      relations: ['variants'],
      select: {
        variants: {
          id: true,
       
          isActive: true
        }
      }
    });
    return category?.variants?.filter(variant => variant.isActive) || [];
  }

  // any extra hooks (e.g. productsCount, parent‐checks)... 
  // you can still override create/update if you need.


}
