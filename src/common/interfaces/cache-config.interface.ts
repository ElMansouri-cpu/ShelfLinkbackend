export interface ICacheConfig {
    ttl: number; // Time to live in seconds
    keyPrefix: string;
    invalidationPatterns: string[];
  }