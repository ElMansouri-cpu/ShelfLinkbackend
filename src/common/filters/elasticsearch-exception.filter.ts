import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from './http-exception.filter';

// Elasticsearch error types
export class ElasticsearchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: any,
  ) {
    super(message);
    this.name = 'ElasticsearchError';
  }
}

@Catch(ElasticsearchError)
export class ElasticsearchExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ElasticsearchExceptionFilter.name);

  catch(exception: ElasticsearchError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const { status, message } = this.mapException(exception);
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: 'ElasticsearchError',
      requestId: this.generateRequestId(),
    };

    // Log Elasticsearch error details
    this.logger.error(
      `Elasticsearch Exception: ${status} ${message}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        exception: exception.message,
        statusCode: exception.statusCode,
        body: exception.body,
      },
    );

    response.status(status).json(errorResponse);
  }

  private mapException(exception: ElasticsearchError) {
    // Map common Elasticsearch errors to appropriate HTTP status codes
    if (exception.statusCode) {
      switch (exception.statusCode) {
        case 404:
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'Search index or document not found',
          };
        case 400:
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Invalid search query or parameters',
          };
        case 429:
          return {
            status: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Search service is temporarily overloaded',
          };
        case 503:
          return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Search service is temporarily unavailable',
          };
        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Search operation failed',
          };
      }
    }

    // Handle specific error messages
    if (exception.message.includes('index_not_found_exception')) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Search index not found',
      };
    }

    if (exception.message.includes('parsing_exception')) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid search query format',
      };
    }

    if (exception.message.includes('timeout')) {
      return {
        status: HttpStatus.REQUEST_TIMEOUT,
        message: 'Search operation timed out',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Search service error occurred',
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 