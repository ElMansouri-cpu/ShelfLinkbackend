# Store Management API Backend

A comprehensive NestJS-based backend API for multi-tenant store management with advanced search capabilities powered by Elasticsearch.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple stores with isolated data
- **User Management**: Supabase-powered authentication and user management
- **Store Management**: Complete CRUD operations for stores and their entities
- **Product Management**: Variants, taxes, brands, categories management
- **Order Management**: Order processing with real-time updates via WebSockets
- **Advanced Search**: Elasticsearch integration for fast, fuzzy search across all entities
- **Bulk Operations**: Efficient bulk indexing and data operations

### Technical Features
- **TypeScript**: Full type safety throughout the application
- **PostgreSQL**: Robust relational database with TypeORM
- **Elasticsearch**: Advanced search capabilities with auto-indexing
- **Docker Support**: Containerized deployment ready
- **Real-time Updates**: WebSocket support for live order updates
- **API Documentation**: Swagger/OpenAPI documentation
- **Validation**: Input validation with class-validator
- **Security**: JWT authentication with Supabase integration

## 🏗️ Architecture

### Project Structure
```
src/
├── auth/                   # Authentication module (Supabase)
├── brands/                 # Brand management
├── categories/             # Category management  
├── common/                 # Shared utilities and base classes
│   ├── controllers/        # Base controller classes
│   ├── dto/               # Data Transfer Objects
│   ├── entities/          # Base entity classes
│   ├── services/          # Base service classes
│   └── types/             # TypeScript type definitions
├── elasticsearch/          # Search module and configuration
├── orders/                # Order and order item management
├── products/              # Product variants and tax management
├── providers/             # Provider management
├── stores/                # Store management
├── supabase/              # Supabase integration
├── unit/                  # Unit of measurement management
├── users/                 # User management
├── app.module.ts          # Main application module
└── main.ts                # Application entry point
```

### Design Patterns Used

#### 1. **Base Classes Architecture**
- `BaseCrudService`: Generic CRUD operations
- `StoreCrudService`: Store-aware CRUD operations
- `SearchableCrudService`: CRUD with automatic search indexing
- `BaseSearchService`: Abstract class for Elasticsearch operations

#### 2. **Mixin Pattern**
- `SearchableMixin`: Adds search capabilities to any service
- Promotes code reuse and modular functionality

#### 3. **Service Layer Pattern**
- Clear separation between controllers, services, and repositories
- Business logic encapsulated in service classes

#### 4. **Repository Pattern**
- TypeORM repositories for data access
- Abstracted database operations

## 🔧 Technology Stack

### Backend Framework
- **NestJS**: Progressive Node.js framework
- **TypeScript**: Type-safe JavaScript
- **Node.js**: Runtime environment

### Database & ORM
- **PostgreSQL**: Primary database
- **TypeORM**: Object-Relational Mapping
- **Elasticsearch**: Search engine

### Authentication & Authorization
- **Supabase**: Authentication provider
- **JWT**: Token-based authentication
- **Passport**: Authentication middleware

### Real-time Communication
- **Socket.IO**: WebSocket implementation
- **@nestjs/websockets**: NestJS WebSocket support

### Validation & Documentation
- **class-validator**: Input validation
- **class-transformer**: Data transformation
- **Swagger/OpenAPI**: API documentation

### Development & Deployment
- **Docker**: Containerization
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Elasticsearch instance
- Supabase account

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/store_management

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200

# Application Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start Elasticsearch (using Docker)**
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

4. **Run the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### Docker Deployment

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

2. **Build Docker image manually**
```bash
./docker-build.sh
```

## 📚 API Documentation

### Base URLs
- Development: `http://localhost:3000`
- Production: Your deployed URL

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Store Management
- `GET /stores` - List user's stores
- `POST /stores` - Create new store
- `GET /stores/:id` - Get store details
- `PUT /stores/:id` - Update store
- `DELETE /stores/:id` - Delete store

#### Product Management
- `GET /stores/:storeId/variants` - List products
- `POST /stores/:storeId/variants` - Create product
- `GET /stores/:storeId/variants/elasticsearch?q=search` - Search products
- `POST /stores/:storeId/variants/elasticsearch/reindex` - Reindex products

#### Order Management
- `GET /stores/:storeId/orders` - List orders
- `POST /stores/:storeId/orders` - Create order
- `PUT /orders/:id/status` - Update order status
- `GET /stores/:storeId/orders/elasticsearch?q=search` - Search orders

#### Brand Management
- `GET /stores/:storeId/brands` - List brands
- `POST /stores/:storeId/brands` - Create brand
- `GET /stores/:storeId/brands/elasticsearch?q=search` - Search brands

#### Category Management
- `GET /stores/:storeId/categories` - List categories
- `POST /stores/:storeId/categories` - Create category
- `GET /stores/:storeId/categories/elasticsearch?q=search` - Search categories

#### Global Search
- `GET /search/global?storeId=:storeId&q=query` - Search across all entities

### Search Capabilities

#### Search Syntax
- **Fuzzy Search**: Automatic fuzzy matching for typos
- **Multi-field Search**: Searches across multiple entity fields
- **Filtering**: Support for complex filters
- **Pagination**: Built-in pagination support

#### Search Examples
```bash
# Basic search
GET /stores/123/variants/elasticsearch?q=laptop

# Search with filters
GET /stores/123/variants/elasticsearch?q=laptop&brand=Apple&category=Electronics

# Paginated search
GET /stores/123/variants/elasticsearch?q=laptop&page=2&limit=10
```

## 🔍 Search Architecture

### Elasticsearch Integration

#### Auto-indexing
- Entities are automatically indexed when created/updated
- Bulk reindexing available for data consistency
- Startup indexing for initial data population

#### Search Services Hierarchy
```typescript
BaseSearchService<T>
├── BrandSearchService
├── CategorySearchService  
├── OrderSearchService
├── UnitSearchService
├── TaxSearchService
├── UserSearchService
└── VariantSearchService
```

#### Search Features
- **Multi-match queries**: Search across multiple fields
- **Fuzzy matching**: Handle typos and variations
- **Boosting**: Prioritize certain fields (name^3, description^2)
- **Filtering**: Filter by store, status, etc.
- **Aggregations**: Future support for analytics

## 🏛️ Database Schema

### Core Entities

#### User
- id, username, email
- subscriptionTier, storeLimit
- user_metadata (JSONB)

#### Store  
- id, name, logo, url
- status, subscription
- userId (owner)

#### Product Variant
- id, name, sku, barcode
- price, stock, images
- brandId, categoryId, storeId

#### Order
- id, status, destination
- orderDate, totalAmount
- userId, storeId

#### Brand/Category
- id, name, description, image
- status, productsCount
- storeId

### Relationships
- User → Store (1:N)
- Store → Variants (1:N)
- Store → Orders (1:N)
- Store → Brands (1:N)
- Store → Categories (1:N)
- Order → OrderItems (1:N)
- Variant → OrderItems (1:N)

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov
```

### Testing Structure
- Unit tests for services and utilities
- E2E tests for API endpoints
- Mock repositories for isolated testing

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Elasticsearch cluster running
- [ ] SSL certificates configured
- [ ] Health checks enabled
- [ ] Logging configured
- [ ] Monitoring setup

### Docker Production
```bash
# Build production image
docker build -t store-management-api .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks
- `GET /health` - Application health status
- Database connectivity check
- Elasticsearch connectivity check

## 📊 Monitoring & Logging

### Application Metrics
- Request/response times
- Error rates
- Database query performance
- Elasticsearch query performance

### Logging
- Structured JSON logging
- Error tracking and reporting
- Search query logging for analytics

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Write tests for new features
3. Follow existing code patterns
4. Update documentation
5. Use conventional commits

### Code Style
- ESLint + Prettier configuration
- TypeScript strict mode
- Consistent naming conventions

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

## 📋 API Collection

A Postman collection is available at `store-management-api.postman_collection.json` for testing all endpoints.

## 🔄 Version History

- **v0.0.1**: Initial release with core functionality
- **v0.1.0**: Added Elasticsearch integration
- **v0.2.0**: Enhanced search capabilities
- **v0.3.0**: WebSocket support for real-time updates 