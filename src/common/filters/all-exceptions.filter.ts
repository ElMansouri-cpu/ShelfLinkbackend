import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from './http-exception.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Internal server error',
      error: exception?.constructor?.name || 'UnknownError',
      requestId: this.generateRequestId(),
    };

    // Log the full error details
    this.logger.error(
      `Unhandled Exception: ${exception?.message || 'Unknown error'}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        stack: exception?.stack,
        exception: exception,
        body: request.body,
        query: request.query,
        params: request.params,
        headers: request.headers,
      },
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 