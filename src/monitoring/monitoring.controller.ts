import { Controller, Get, Query } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  getPerformanceMetrics() {
    return this.monitoringService.getPerformanceMetrics();
  }

  @Get('requests')
  getRequestMetrics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('userId') userId?: string,
    @Query('storeId') storeId?: string,
  ) {
    const start = startTime ? new Date(startTime) : undefined;
    const end = endTime ? new Date(endTime) : undefined;

    return this.monitoringService.getRequestMetrics(start, end, userId, storeId);
  }

  @Get('errors')
  getErrorMetrics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('userId') userId?: string,
    @Query('storeId') storeId?: string,
  ) {
    const start = startTime ? new Date(startTime) : undefined;
    const end = endTime ? new Date(endTime) : undefined;

    return this.monitoringService.getErrorMetrics(start, end, userId, storeId);
  }

  @Get('slowest-endpoints')
  getSlowestEndpoints(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.monitoringService.getSlowestEndpoints(limitNumber);
  }

  @Get('error-prone-endpoints')
  getMostErrorProneEndpoints(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.monitoringService.getMostErrorProneEndpoints(limitNumber);
  }
} 