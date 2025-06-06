import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ErrorResponse } from './http-exception.filter';

@Catch(QueryFailedError, EntityNotFoundError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    
    const { status, message } = this.mapException(exception);
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: 'DatabaseError',
      requestId: this.generateRequestId(),
    };

    // Log database error details
    this.logger.error(
      `Database Exception: ${status} ${message}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        databaseError: exception.message,
        stack: exception.stack,
      },
    );

    reply.status(status).send(errorResponse);
  }

  private mapException(exception: QueryFailedError | EntityNotFoundError) {
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      };
    }

    // Handle QueryFailedError
    const error = exception as QueryFailedError & { code?: string };
    
    switch (error.code) {
      case '23505': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
        };
      case '23503': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related resource',
        };
      case '23502': // Not null constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
        };
      case '22001': // String data too long
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Input data exceeds maximum length',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
        };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 