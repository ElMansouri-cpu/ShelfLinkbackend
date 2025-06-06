# 🐳 Docker Setup Guide

## Overview

This guide covers the complete Docker setup for the Store Management API with integrated Elasticsearch and Redis services.

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+ 
- Docker Compose 2.0+
- 4GB+ RAM available for containers
- 10GB+ disk space for persistent data

### 1. Environment Configuration

Create a `.env` file with the required environment variables:

```bash
# Application Configuration
PORT=1919
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration (external)
DATABASE_URL=postgresql://username:password@host:5432/store_management

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# JWT Configuration
JWT_SECRET=your_32_character_minimum_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Redis Configuration (optional password)
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# Elasticsearch is configured automatically via Docker networking
```

### 2. Start All Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## 📋 Services Overview

### Core Application (`app`)
- **Port**: 1919
- **Dependencies**: Elasticsearch + Redis
- **Health Check**: `/health` endpoint
- **Auto-restart**: Yes

### Elasticsearch (`elasticsearch`)
- **Port**: 9200 (HTTP), 9300 (Transport)
- **Version**: 8.11.0
- **Memory**: 1GB (production), 512MB (development)
- **Security**: Disabled for development
- **Persistent Data**: `./docker/elasticsearch/data`

### Redis (`redis`)
- **Port**: 6379
- **Version**: 7-alpine
- **Memory Limit**: 512MB (production), 256MB (development)
- **Persistence**: AOF + RDB snapshots
- **Policy**: allkeys-lru eviction
- **Persistent Data**: `./docker/redis/data`

### Development Tools (Optional)

#### Redis Commander
- **Port**: 8081
- **URL**: http://localhost:8081
- **Purpose**: Redis database management UI

#### Elasticsearch Head
- **Port**: 9100
- **URL**: http://localhost:9100
- **Purpose**: Elasticsearch cluster management UI

## 🛠️ Development vs Production

### Development Mode
```bash
# Uses docker-compose.override.yml automatically
docker-compose up -d

# Includes development tools by default
# - Redis Commander at http://localhost:8081
# - Elasticsearch Head at http://localhost:9100
# - Hot reload enabled for application
# - Reduced memory allocation
```

### Production Mode
```bash
# Production configuration without development tools
docker-compose -f docker-compose.yml up -d

# Or with specific production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Tools-Only Mode
```bash
# Enable development tools explicitly
docker-compose --profile tools up -d redis-commander elasticsearch-head
```

## 🔧 Configuration Details

### Elasticsearch Configuration
- **Cluster Name**: `store-management` (prod) / `store-management-dev` (dev)
- **Node Name**: Configurable per environment
- **Security**: Disabled for development, should be enabled in production
- **CORS**: Enabled for frontend access
- **Memory Lock**: Enabled for better performance

### Redis Configuration
- **Persistence**: AOF (appendonly) + RDB snapshots
- **Memory Policy**: `allkeys-lru` for automatic eviction
- **Connection**: Keep-alive enabled with 300s timeout
- **Snapshots**: Multiple save points for data safety
- **Max Memory**: Configured per environment

### Application Configuration
- **Environment Variables**: Passed through from `.env` file
- **Service Discovery**: Uses Docker internal networking
- **Health Checks**: All services have health monitoring
- **Restart Policy**: `unless-stopped` for reliability

## 📊 Health Monitoring

### Check Service Health
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs elasticsearch
docker-compose logs redis
docker-compose logs app

# Check application health endpoint
curl http://localhost:1919/health
```

### Health Endpoints
- **Application**: `GET http://localhost:1919/health`
- **Elasticsearch**: `GET http://localhost:9200/_cluster/health`
- **Redis**: `docker exec store-redis redis-cli ping`

## 🗄️ Data Persistence

### Persistent Volumes
```
./docker/
├── elasticsearch/
│   └── data/          # Elasticsearch indices and data
└── redis/
    └── data/          # Redis AOF and RDB files
```

### Backup & Restore
```bash
# Backup Redis data
docker exec store-redis redis-cli BGSAVE

# Backup Elasticsearch indices
curl -X PUT "localhost:9200/_snapshot/backup/_settings" -H 'Content-Type: application/json' -d'
{
  "location": "/usr/share/elasticsearch/backup"
}'
```

## 🚀 Performance Tuning

### Memory Allocation
```yaml
# Production recommendations:
elasticsearch:
  ES_JAVA_OPTS: "-Xms2g -Xmx2g"  # 50% of available RAM
redis:
  maxmemory: 1gb                  # Based on usage patterns
```

### Connection Limits
```yaml
elasticsearch:
  ulimits:
    nofile: 65536                 # File descriptor limit
redis:
  sysctls:
    net.core.somaxconn: 65535     # Connection backlog
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check available resources
docker system df
docker system prune  # Clean up if needed

# Check service logs
docker-compose logs [service-name]
```

#### 2. Elasticsearch Memory Issues
```bash
# Check Java memory settings
docker-compose logs elasticsearch | grep -i "memory"

# Adjust in docker-compose.yml:
ES_JAVA_OPTS: "-Xms512m -Xmx512m"  # Reduce if needed
```

#### 3. Redis Connection Issues
```bash
# Test Redis connectivity
docker exec store-redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

#### 4. Application Can't Connect to Services
```bash
# Verify network connectivity
docker-compose exec app ping elasticsearch
docker-compose exec app ping redis

# Check environment variables
docker-compose exec app env | grep -E "(ELASTICSEARCH|REDIS)"
```

### Performance Issues

#### 1. Slow Elasticsearch Queries
- Check index mappings and optimize queries
- Monitor cluster health: `curl localhost:9200/_cluster/health`
- Consider increasing memory allocation

#### 2. High Redis Memory Usage
- Monitor memory usage: `docker exec store-redis redis-cli info memory`
- Adjust maxmemory policy if needed
- Review TTL settings for cached data

#### 3. Application Performance
- Check cache hit rates: `curl localhost:1919/cache/metrics`
- Monitor application logs for slow queries
- Verify all health checks are passing

## 🔐 Security Considerations

### Development
- Elasticsearch security is disabled for ease of development
- Redis may run without password (configurable)
- All services expose ports to localhost

### Production Recommendations
- Enable Elasticsearch security and authentication
- Set strong Redis password
- Use Docker secrets for sensitive configuration
- Restrict network access using firewalls
- Regular security updates for base images

## 📚 Useful Commands

### Service Management
```bash
# Start specific service
docker-compose up -d elasticsearch

# Restart service
docker-compose restart app

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Data Management
```bash
# View Elasticsearch indices
curl localhost:9200/_cat/indices?v

# View Redis keys
docker exec store-redis redis-cli keys "*"

# Clear Redis cache
docker exec store-redis redis-cli flushall
```

### Monitoring
```bash
# Resource usage
docker stats

# Service logs (follow)
docker-compose logs -f app

# Container inspection
docker inspect store-elasticsearch
```

## 🔄 Updates and Maintenance

### Updating Services
```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d --force-recreate
```

### Backup Before Updates
```bash
# Create backup of data volumes
docker run --rm -v $(pwd)/docker:/backup alpine tar czf /backup/docker-backup-$(date +%Y%m%d).tar.gz /backup
```

## 🆘 Support

For issues with this Docker setup:
1. Check the troubleshooting section above
2. Review service logs using `docker-compose logs [service]`
3. Verify system resources (memory, disk space)
4. Check the main application documentation

---

This setup provides a complete development and production-ready environment for the Store Management API with enterprise-grade caching and search capabilities. 