import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfigService } from './config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { ElasticsearchExceptionFilter } from './common/filters/elasticsearch-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(AppConfigService);
  
  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // Disable for development
    contentSecurityPolicy: configService.isProduction ? undefined : false,
  }));
  
  // CORS configuration
  app.enableCors({
    origin: configService.isDevelopment ? '*' : [configService.frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  
  // Global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties that don't have decorators
    transform: true, // Transform payloads to be objects typed according to their DTO classes
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    disableErrorMessages: configService.isProduction, // Disable detailed error messages in production
    validateCustomDecorators: true,
  }));
  
  // Global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DatabaseExceptionFilter(),
    new ElasticsearchExceptionFilter(),
    new AllExceptionsFilter(), // Catch-all must be last
  );
  
  // Graceful shutdown
  app.enableShutdownHooks();
  
  const port = configService.port;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📖 Environment: ${configService.nodeEnv}`);
  console.log(`🔍 Elasticsearch: ${configService.elasticsearchNode}`);
}

bootstrap().catch(err => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});
