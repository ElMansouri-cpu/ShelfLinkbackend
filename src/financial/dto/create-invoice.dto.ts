import { IsNumber, IsString, IsDate, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  orderId: number;

  @IsString()
  orderType: string;

  @IsDate()
  @IsOptional()
  invoiceDate?: Date;

  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsNumber()
  amountDue: number;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
} 