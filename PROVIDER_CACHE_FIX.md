# Provider Cache Invalidation Fix

## Problem
When creating, updating, or deleting providers via the `providers.controller.ts`, the cache for the `elasticsearch` and `fetch` endpoints was not being properly invalidated. This meant that subsequent searches would return cached results that didn't include the newly created/updated/deleted providers.

## Root Cause
The issue was in the cache eviction interceptor (`cache-evict.interceptor.ts`). The `patternGenerator` and `keyGenerator` functions were being called with `...args` instead of properly passing the `request` object as the first parameter for controller methods.

## Solution

### 1. Fixed Cache Eviction Interceptor
Updated `src/cache/interceptors/cache-evict.interceptor.ts` to properly pass the request object to key generators:

```typescript
// Before
const key = metadata.keyGenerator(...args);
const pattern = metadata.patternGenerator(...args);

// After
const key = request ? metadata.keyGenerator(request, ...args) : metadata.keyGenerator(...args);
const pattern = request ? metadata.patternGenerator(request, ...args) : metadata.patternGenerator(...args);
```

### 2. Fixed Cache Interceptor
Updated `src/cache/interceptors/cache.interceptor.ts` to properly pass the request object to key generators:

```typescript
// Before
return metadata.keyGenerator(...args);

// After
return request ? metadata.keyGenerator(request, ...args) : metadata.keyGenerator(...args);
```

### 3. Enhanced Cache Eviction Patterns
Updated the cache eviction patterns in both the service and controller to properly match the cache keys used by the search endpoints:

#### Service Level (`providers.service.ts`)
```typescript
@CacheEvict({
  patternGenerator: (createProviderDto) => [
    `store:${createProviderDto.storeId}:providers*`,
    `search:providers:store=${createProviderDto.storeId}:*`,
    `search:providers:*`
  ].join('|'),
  cascade: true,
  cascadePatterns: [
    'store:*:provider_stats',
    'store:*:providers:counts',
  ]
})
```

#### Controller Level (`providers.controller.ts`)
```typescript
@CacheEvict({
  patternGenerator: (request: any) => {
    const storeId = request.params.storeId;
    return [
      `search:providers:store=${storeId}:*`,
      `search:providers:*`
    ].join('|');
  }
})
```

## Cache Key Patterns
The search endpoints use these cache key patterns:
- `search:providers:store=${storeId}:q=:page=1:limit=50` (elasticsearch and fetch endpoints)
- `search:providers:nearby:store=${storeId}:lat=...:lng=...:radius=...` (nearby endpoint)
- `search:providers:query:store=${storeId}:query=...` (filterquery endpoint)

## Testing
Use the test script `test-provider-cache-fix.js` to verify the fix:

```bash
node test-provider-cache-fix.js
```

The test will:
1. Get initial search results (should be cached)
2. Create a new provider
3. Get search results again (should include the new provider)
4. Test the fetch endpoint as well
5. Clean up by deleting the test provider

## Debug Logging
Added debug logging to help troubleshoot cache invalidation issues:
- Controller level: Logs when cache eviction is triggered and which patterns are being evicted
- Service level: Logs when service cache eviction is triggered

## Files Modified
1. `src/cache/interceptors/cache-evict.interceptor.ts` - Fixed request object passing
2. `src/cache/interceptors/cache.interceptor.ts` - Fixed request object passing
3. `src/providers/providers.service.ts` - Enhanced cache eviction patterns
4. `src/providers/providers.controller.ts` - Added controller-level cache eviction
5. `test-provider-cache-fix.js` - Test script to verify the fix

## Result
Now when a provider is created, updated, or deleted, the cache for the search endpoints will be properly invalidated, ensuring that subsequent searches return the most up-to-date data. 