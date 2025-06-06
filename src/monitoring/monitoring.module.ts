import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  providers: [MonitoringService, MetricsInterceptor],
  controllers: [MonitoringController],
  exports: [MonitoringService, MetricsInterceptor],
})
export class MonitoringModule {} 