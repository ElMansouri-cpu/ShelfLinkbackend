import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ErrorResponse } from './http-exception.filter';

@Catch(QueryFailedError, EntityNotFoundError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const { status, message, error } = this.mapException(exception);
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      requestId: this.generateRequestId(),
    };

    // Log database error details
    this.logger.error(
      `Database Exception: ${status} ${message}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        exception: exception.message,
        query: (exception as any).query,
        parameters: (exception as any).parameters,
      },
    );

    response.status(status).json(errorResponse);
  }

  private mapException(exception: QueryFailedError | EntityNotFoundError) {
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'EntityNotFoundError',
      };
    }

    if (exception instanceof QueryFailedError) {
      const error = exception as any;
      
      // Handle common PostgreSQL errors
      switch (error.code) {
        case '23505': // unique_violation
          return {
            status: HttpStatus.CONFLICT,
            message: 'Resource already exists',
            error: 'UniqueViolationError',
          };
        case '23503': // foreign_key_violation
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Invalid reference to related resource',
            error: 'ForeignKeyViolationError',
          };
        case '23502': // not_null_violation
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Required field is missing',
            error: 'NotNullViolationError',
          };
        case '22001': // string_data_right_truncation
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Data too long for field',
            error: 'DataTooLongError',
          };
        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Database operation failed',
            error: 'QueryFailedError',
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred',
      error: 'DatabaseError',
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 