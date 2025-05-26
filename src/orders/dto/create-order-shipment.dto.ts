import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class CreateOrderShipmentDto {
  @IsString()
  orderId: string;

  @IsString()
  carrier: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @IsOptional()
  shipmentDate?: Date;

  @IsDate()
  @IsOptional()
  estimatedDeliveryDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 