import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsBoolean, IsNumber, IsEnum, IsArray, ValidateNested, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// BRANDS
// ============================================================================

export class CreateBrandDto {
  @ApiProperty({
    description: 'The name of the brand',
    example: 'Nike',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the brand',
    example: 'Just Do It - Leading sports and lifestyle brand',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the brand logo image',
    example: 'https://example.com/nike-logo.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Official website URL of the brand',
    example: 'https://www.nike.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Whether the brand is active and available for use',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'The name of the brand',
    example: 'Nike',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the brand',
    example: 'Just Do It - Leading sports and lifestyle brand',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the brand logo image',
    example: 'https://example.com/nike-logo.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Official website URL of the brand',
    example: 'https://www.nike.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Whether the brand is active and available for use',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// CATEGORIES
// ============================================================================

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Electronics',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the category',
    example: 'Electronic devices and accessories',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the category icon image',
    example: 'https://example.com/electronics-icon.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  icon?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent category (for hierarchical categories)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active and available for use',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'The name of the category',
    example: 'Electronics',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the category',
    example: 'Electronic devices and accessories',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the category icon image',
    example: 'https://example.com/electronics-icon.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  icon?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent category (for hierarchical categories)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active and available for use',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// PROVIDERS
// ============================================================================

export class CreateProviderDto {
  @ApiProperty({
    description: 'The name of the provider/supplier',
    example: 'ABC Electronics Ltd',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the provider',
    example: 'Leading electronics supplier with 20+ years of experience',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@abcelectronics.com',
    format: 'email',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Provider website URL',
    example: 'https://www.abcelectronics.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the provider',
    example: '123 Business St, City, State 12345',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether the provider is active and available for use',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProviderDto {
  @ApiPropertyOptional({
    description: 'The name of the provider/supplier',
    example: 'ABC Electronics Ltd',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the provider',
    example: 'Leading electronics supplier with 20+ years of experience',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@abcelectronics.com',
    format: 'email',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Provider website URL',
    example: 'https://www.abcelectronics.com',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the provider',
    example: '123 Business St, City, State 12345',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether the provider is active and available for use',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// UNITS
// ============================================================================

export class CreateUnitDto {
  @ApiProperty({
    description: 'The name of the unit',
    example: 'Kilogram',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The symbol/abbreviation for the unit',
    example: 'kg',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the unit',
    example: 'Standard unit of mass in the metric system',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the unit is active and available for use',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitDto {
  @ApiPropertyOptional({
    description: 'The name of the unit',
    example: 'Kilogram',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The symbol/abbreviation for the unit',
    example: 'kg',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the unit',
    example: 'Standard unit of mass in the metric system',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the unit is active and available for use',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// USERS
// ============================================================================

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The username of the user',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'The first name of the user',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'The role of the user in the system',
    example: 'admin',
    enum: ['admin', 'manager', 'employee', 'customer'],
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// PRODUCTS - VARIANTS
// ============================================================================

export class CreateVariantDto {
  @ApiProperty({
    description: 'The name of the product variant',
    example: 'iPhone 14 Pro 128GB Space Black',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The SKU (Stock Keeping Unit) of the variant',
    example: 'IPH14P-128-SB',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the variant',
    example: 'Latest iPhone with 128GB storage in Space Black color',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The price of the variant',
    example: 999.99,
    minimum: 0,
  })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: 'The cost price of the variant',
    example: 750.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'The current stock quantity',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'The minimum stock level for reorder alerts',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional({
    description: 'The weight of the variant in grams',
    example: 206,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    description: 'The dimensions of the variant (LxWxH in cm)',
    example: '14.7x7.1x0.8',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({
    description: 'URL to the variant image',
    example: 'https://example.com/iphone14pro-black.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: 'Whether the variant is active and available for sale',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({
    description: 'The name of the product variant',
    example: 'iPhone 14 Pro 128GB Space Black',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The SKU (Stock Keeping Unit) of the variant',
    example: 'IPH14P-128-SB',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'A brief description of the variant',
    example: 'Latest iPhone with 128GB storage in Space Black color',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'The price of the variant',
    example: 999.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    description: 'The cost price of the variant',
    example: 750.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'The current stock quantity',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'The minimum stock level for reorder alerts',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional({
    description: 'The weight of the variant in grams',
    example: 206,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    description: 'The dimensions of the variant (LxWxH in cm)',
    example: '14.7x7.1x0.8',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({
    description: 'URL to the variant image',
    example: 'https://example.com/iphone14pro-black.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: 'Whether the variant is active and available for sale',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// PRODUCTS - TAXES
// ============================================================================

export class CreateTaxDto {
  @ApiProperty({
    description: 'The name of the tax',
    example: 'VAT',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The tax rate as a percentage',
    example: 20.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  rate: number;

  @ApiPropertyOptional({
    description: 'A brief description of the tax',
    example: 'Value Added Tax at 20%',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the tax is active and applicable',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxDto {
  @ApiPropertyOptional({
    description: 'The name of the tax',
    example: 'VAT',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The tax rate as a percentage',
    example: 20.0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({
    description: 'A brief description of the tax',
    example: 'Value Added Tax at 20%',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the tax is active and applicable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// ORDERS
// ============================================================================

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
  COMPLETED = 'completed'
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup'
}

export class CreateOrderItemDto {
  @ApiPropertyOptional({
    description: 'ID of the order (auto-assigned when creating order)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    description: 'ID of the product variant',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsString()
  variantId: string;

  @ApiProperty({
    description: 'Quantity of the variant ordered',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Total amount for this item (quantity * unit price)',
    example: 1999.98,
    minimum: 0,
  })
  @IsNumber()
  totalAmount: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID of the user placing the order',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'ID of the store where the order is placed',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  @IsString()
  storeId: string;

  @ApiProperty({
    description: 'Total amount of the order',
    example: 1999.98,
    minimum: 0,
  })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Type of order (delivery or pickup)',
    example: OrderType.DELIVERY,
    enum: OrderType,
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({
    description: 'Delivery destination or pickup location',
    example: '123 Main St, City, State 12345',
    maxLength: 200,
  })
  @IsString()
  destination: string;

  @ApiProperty({
    description: 'Latitude coordinate for delivery location',
    example: 40.7128,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate for delivery location',
    example: -74.0060,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Current status of the order',
    example: OrderStatus.PENDING,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({
    description: 'List of items in the order',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Order number (auto-generated)',
    example: 'ORD-2024-001',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Total amount of the order',
    example: 1999.98,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Discount amount applied to the order',
    example: 100.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount for the order',
    example: 200.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Net amount after discounts and taxes',
    example: 2099.98,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  netAmount?: number;

  @ApiPropertyOptional({
    description: 'Current status of the order',
    example: OrderStatus.PROCESSING,
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Date when the order was placed',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  orderDate?: Date;

  @ApiPropertyOptional({
    description: 'Whether the order is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrderItemDto {
  @ApiPropertyOptional({
    description: 'ID of the order',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'ID of the product variant',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Quantity of the variant ordered',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit price of the variant',
    example: 999.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Discount amount for this item',
    example: 50.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount for this item',
    example: 100.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Whether the order item is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// COMMON RESPONSES
// ============================================================================

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Bad Request',
  })
  message: string;

  @ApiProperty({
    description: 'Error details',
    example: 'Validation failed',
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/stores/123/brands',
  })
  path: string;
}

export class SuccessResponseDto<T> {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;
} 