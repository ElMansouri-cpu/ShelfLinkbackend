import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorResponse } from './http-exception.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Internal server error',
      error: 'UnhandledException',
      requestId: this.generateRequestId(),
    };

    // Log error details
    this.logger.error(
      `Unhandled Exception: ${HttpStatus.INTERNAL_SERVER_ERROR}`,
      {
        requestId: errorResponse.requestId,
        path: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        exception: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    );

    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(errorResponse);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 