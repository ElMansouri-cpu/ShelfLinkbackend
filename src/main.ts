import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfigService } from './config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { ElasticsearchExceptionFilter } from './common/filters/elasticsearch-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsInterceptor } from './monitoring/interceptors/metrics.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );
  
  // Get configuration service
  const configService = app.get(AppConfigService);
  
  // Get monitoring interceptor
  const metricsInterceptor = app.get(MetricsInterceptor);
  
  // Register Fastify plugins
  await app.register(require('@fastify/helmet'), {
    crossOriginEmbedderPolicy: false, // Disable for development
    contentSecurityPolicy: configService.isProduction ? undefined : false,
  });
  
  await app.register(require('@fastify/cors'), {
    origin: configService.isDevelopment ? true : [configService.frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  
  // Global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties that don't have decorators
    transform: true, // Transform payloads to be objects typed according to their DTO classes
    forbidNonWhitelisted: false, // Temporarily disable to debug DTO issues
    disableErrorMessages: configService.isProduction, // Disable detailed error messages in production
    validateCustomDecorators: true,
  }));
  
  // Global interceptors
  app.useGlobalInterceptors(metricsInterceptor);
  
  // Global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DatabaseExceptionFilter(),
    new ElasticsearchExceptionFilter(),
    new AllExceptionsFilter(), // Catch-all must be last
  );
  
  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('ShelfLink API')
    .setDescription(`
      # ShelfLink Backend API Documentation
      
      ## Overview
      ShelfLink is a comprehensive inventory and order management system for multi-tenant stores.
      
      ## Features
      - **Multi-tenant Architecture**: Each store operates independently
      - **Product Management**: Complete product catalog with variants and taxes
      - **Order Management**: Full order lifecycle with real-time updates
      - **User Management**: Role-based access control
      - **Search & Analytics**: Advanced search and reporting capabilities
      - **Caching**: Redis-based caching for optimal performance
      
      ## Authentication
      This API uses Supabase authentication. Include your JWT token in the Authorization header:
      \`Authorization: Bearer <your-jwt-token>\`
      
      ## Rate Limiting
      API endpoints are rate-limited to ensure fair usage. Limits vary by endpoint.
      
      ## Error Handling
      All endpoints return consistent error responses with appropriate HTTP status codes.
      
      ## Store Context
      Most endpoints require a store ID in the URL path. This ensures data isolation between stores.
    `)
    .setVersion('1.0.0')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Stores', 'Store management and configuration')
    .addTag('Users', 'User management and profiles')
    .addTag('Brands', 'Product brand management')
    .addTag('Categories', 'Product category management')
    .addTag('Providers', 'Supplier and provider management')
    .addTag('Units', 'Measurement units management')
    .addTag('Products', 'Product catalog management')
    .addTag('Variants', 'Product variant management')
    .addTag('Taxes', 'Tax configuration and management')
    .addTag('Orders', 'Order management and processing')
    .addTag('Order Items', 'Order line item management')
    .addTag('Search', 'Advanced search capabilities')
    .addTag('Health', 'System health and monitoring')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for references
    )
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.shelflink.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'ShelfLink API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c3e50; font-size: 36px; }
      .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    `,
  });
  
  // Graceful shutdown
  app.enableShutdownHooks();
  
  const port = configService.port;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📖 Environment: ${configService.nodeEnv}`);
  console.log(`🔍 Elasticsearch: ${configService.elasticsearchNode}`);
  console.log(`🔄 Redis: ${configService.redisHost}:${configService.redisPort}`);
  console.log(`📊 Monitoring: http://localhost:${port}/monitoring/metrics`);
  console.log(`❤️  Health Check: http://localhost:${port}/health`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`⚡ Server: Fastify (High Performance)`);
}

bootstrap().catch(err => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});
