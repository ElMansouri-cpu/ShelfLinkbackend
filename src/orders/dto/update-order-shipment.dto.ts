import { IsString, IsNumber, IsDate, IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrderShipmentDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  carrier?: string;

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