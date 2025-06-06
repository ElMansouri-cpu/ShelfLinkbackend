import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any;
  requestId?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.extractMessage(exceptionResponse),
      error: exception.name,
      requestId: this.generateRequestId(),
    };

    // Add validation details for 400 errors
    if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object') {
      errorResponse.details = (exceptionResponse as any).message;
    }

    // Log error details
    this.logger.error(
      `HTTP Exception: ${status} ${exception.message}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        body: request.body,
        query: request.query,
        params: request.params,
        userAgent: request.get('user-agent'),
        ip: request.ip,
      },
    );

    response.status(status).json(errorResponse);
  }

  private extractMessage(response: any): string | string[] {
    if (typeof response === 'string') {
      return response;
    }
    
    if (typeof response === 'object' && response.message) {
      return response.message;
    }
    
    return 'Internal server error';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 