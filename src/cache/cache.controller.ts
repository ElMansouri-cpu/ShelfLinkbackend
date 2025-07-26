import { Controller, Get, Post, Delete, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { CacheMonitorService } from './monitoring/cache-monitor.service';

@ApiTags('Cache Management')
@Controller('cache')
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheMonitorService: CacheMonitorService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get cache performance metrics' })
  @ApiResponse({ status: 200, description: 'Cache metrics retrieved successfully' })
  async getMetrics() {
    return {
      success: true,
      data: this.cacheService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get comprehensive cache performance report' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  async getPerformanceReport() {
    const report = await this.cacheMonitorService.generatePerformanceReport();
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get cache performance trends' })
  @ApiResponse({ status: 200, description: 'Performance trends retrieved successfully' })
  async getPerformanceTrends() {
    return {
      success: true,
      data: this.cacheMonitorService.getPerformanceTrends(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get current cache alerts' })
  @ApiResponse({ status: 200, description: 'Cache alerts retrieved successfully' })
  async getAlerts() {
    return {
      success: true,
      data: this.cacheMonitorService.getCurrentAlerts(),
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('alerts')
  @ApiOperation({ summary: 'Clear all cache alerts' })
  @ApiResponse({ status: 200, description: 'Cache alerts cleared successfully' })
  async clearAlerts() {
    this.cacheMonitorService.clearAlerts();
    return {
      success: true,
      message: 'All cache alerts cleared',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get specific cache key value' })
  @ApiResponse({ status: 200, description: 'Cache key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cache key not found' })
  async getCacheKey(@Param('key') key: string) {
    const value = await this.cacheService.get(key);
    const exists = await this.cacheService.exists(key);
    
    if (!exists) {
      return {
        success: false,
        message: 'Cache key not found',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }

    const ttl = await this.cacheService.getTTL(key);
    
    return {
      success: true,
      data: {
        key,
        value,
        ttl,
        exists,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('key/:key')
  @ApiOperation({ summary: 'Delete specific cache key' })
  @ApiResponse({ status: 200, description: 'Cache key deleted successfully' })
  async deleteCacheKey(@Param('key') key: string) {
    await this.cacheService.del(key);
    return {
      success: true,
      message: `Cache key '${key}' deleted`,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('pattern/:pattern')
  @ApiOperation({ summary: 'Delete cache keys matching pattern' })
  @ApiResponse({ status: 200, description: 'Cache keys deleted successfully' })
  async deleteCachePattern(@Param('pattern') pattern: string) {
    const deletedCount = await this.cacheService.invalidatePattern(pattern);
    return {
      success: true,
      message: `Deleted ${deletedCount} cache keys matching pattern '${pattern}'`,
      data: { deletedCount, pattern },
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Clear all cache for specific user' })
  @ApiResponse({ status: 200, description: 'User cache cleared successfully' })
  async clearUserCache(@Param('userId') userId: string) {
    const deletedCount = await this.cacheService.invalidateUserCache(userId);
    return {
      success: true,
      message: `Cleared ${deletedCount} cache entries for user '${userId}'`,
      data: { deletedCount, userId },
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('store/:storeId')
  @ApiOperation({ summary: 'Clear all cache for specific store' })
  @ApiResponse({ status: 200, description: 'Store cache cleared successfully' })
  async clearStoreCache(@Param('storeId') storeId: string) {
    const deletedCount = await this.cacheService.invalidateStoreCache(storeId);
    return {
      success: true,
      message: `Cleared ${deletedCount} cache entries for store '${storeId}'`,
      data: { deletedCount, storeId },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('warm')
  @ApiOperation({ summary: 'Warm cache with frequently accessed data' })
  @ApiResponse({ status: 200, description: 'Cache warming initiated successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Type of data to warm (users, stores, search)' })
  async warmCache(@Query('type') type?: string) {
    // This is a simplified cache warming - in a real implementation,
    // you would have specific warming strategies for different data types
    
    const warmingKeys: Array<{ key: string; factory: () => Promise<any>; ttl?: number }> = [];
    
    if (!type || type === 'static') {
      // Add some static data warming
      warmingKeys.push({
        key: 'static:app_config',
        factory: async () => ({ version: '1.0', features: ['cache', 'search'] }),
        ttl: 3600,
      });
    }

    if (warmingKeys.length > 0) {
      await this.cacheService.warmCache(warmingKeys);
    }

    return {
      success: true,
      message: `Cache warming initiated for ${warmingKeys.length} keys`,
      data: { warmedKeys: warmingKeys.length, type: type || 'all' },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Optimize cache performance' })
  @ApiResponse({ status: 200, description: 'Cache optimization completed' })
  async optimizeCache() {
    const result = await this.cacheMonitorService.optimizeCache();
    return {
      success: true,
      message: 'Cache optimization completed',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('all')
  @ApiOperation({ summary: 'Clear all cache entries (use with caution)' })
  @ApiResponse({ status: 200, description: 'All cache entries cleared' })
  async clearAllCache() {
    await this.cacheService.reset();
    return {
      success: true,
      message: 'All cache entries cleared',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('cleanup-orphaned-brand')
  @ApiOperation({ summary: 'Clean up orphaned brand document from Elasticsearch' })
  @ApiResponse({ status: 200, description: 'Orphaned brand cleaned up successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        brandId: { type: 'number', description: 'Brand ID to clean up' },
        storeId: { type: 'string', description: 'Store ID for the brand' }
      },
      required: ['brandId', 'storeId']
    }
  })
  async cleanupOrphanedBrand(@Body() body: { brandId: number; storeId: string }) {
    try {
      // Import the brand search service dynamically to avoid circular dependencies
      const { BrandSearchService } = await import('../brands/services/brand-search.service');
      const { ElasticsearchService } = await import('@nestjs/elasticsearch');
      
      // Create a temporary instance to clean up the orphaned document
      const esService = new ElasticsearchService({
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
      });
      
      const brandSearchService = new BrandSearchService(esService, null as any);
      
      console.log(`🧹 Cleaning up orphaned brand ${body.brandId} from Elasticsearch...`);
      
      // Remove the orphaned document from Elasticsearch
      await brandSearchService.removeEntity(body.brandId);
      
      // Also clear any related cache entries
      const cachePatterns = [
        `search:brands:store=${body.storeId}:*`,
        `search:brands:store=${body.storeId}*`,
        `store:${body.storeId}:brands*`,
        `brand:${body.brandId}*`
      ];
      
      let totalCleared = 0;
      for (const pattern of cachePatterns) {
        const cleared = await this.cacheService.invalidatePattern(pattern);
        totalCleared += cleared;
      }
      
      console.log(`✅ Successfully cleaned up orphaned brand ${body.brandId} and cleared ${totalCleared} cache entries`);
      
      return {
        success: true,
        message: `Orphaned brand ${body.brandId} cleaned up successfully`,
        data: {
          brandId: body.brandId,
          storeId: body.storeId,
          cacheEntriesCleared: totalCleared
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error(`❌ Failed to clean up orphaned brand ${body.brandId}:`, error);
      
      return {
        success: false,
        message: `Failed to clean up orphaned brand ${body.brandId}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
} 