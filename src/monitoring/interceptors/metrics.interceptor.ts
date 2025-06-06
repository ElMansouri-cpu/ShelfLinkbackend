import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MonitoringService } from '../monitoring.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const requestInfo = {
      method: request.method,
      path: this.sanitizePath(request.route?.path || request.url),
      userAgent: request.get('user-agent'),
      ip: request.ip || request.connection.remoteAddress,
      userId: request.user?.userId,
      storeId: request.params?.storeId,
    };

    return next.handle().pipe(
      tap(() => {
        // Record successful request
        const responseTime = Date.now() - startTime;
        this.monitoringService.recordRequest({
          ...requestInfo,
          statusCode: response.statusCode,
          responseTime,
        });
      }),
      catchError((error) => {
        // Record error request
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;

        this.monitoringService.recordRequest({
          ...requestInfo,
          statusCode,
          responseTime,
        });

        this.monitoringService.recordError({
          error: error.message || 'Unknown error',
          stack: error.stack,
          path: requestInfo.path,
          method: requestInfo.method,
          userId: requestInfo.userId,
          storeId: requestInfo.storeId,
        });

        throw error;
      }),
    );
  }

  private sanitizePath(path: string): string {
    // Replace dynamic route parameters with placeholders for better grouping
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9-]{8,}/g, '/:hash');
  }
} 