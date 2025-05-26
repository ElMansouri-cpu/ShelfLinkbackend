import { IsEnum, IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, Status } from '../entities/order.entity';
import { CreateOrderItemDto } from './create-order-item.dto'; // optional

export class CreateOrderDto {
  @IsString()
  userId: string;

  @IsString()
  storeId: string;

  @IsNumber()
  totalAmount: number;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsString()
  destination: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;



  @IsEnum(Status)
  status: Status;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]; // optional, if you support nested create
}
