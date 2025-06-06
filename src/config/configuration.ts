import * as Joi from 'joi';

export interface AppConfig {
  // Application
  port: number;
  nodeEnv: string;
  frontendUrl: string;

  // Database
  databaseUrl: string;

  // Supabase
  supabaseUrl: string;
  supabaseKey: string;
  supabaseJwtSecret: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;

  // Elasticsearch
  elasticsearchNode: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisDb: number;
}

const configSchema = Joi.object({
  // Application
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  FRONTEND_URL: Joi.string().uri().required(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Supabase
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_KEY: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Elasticsearch
  ELASTICSEARCH_NODE: Joi.string().uri().default('http://localhost:9200'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
});

export const validateConfig = (config: Record<string, unknown>): AppConfig => {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  return {
    port: value.PORT,
    nodeEnv: value.NODE_ENV,
    frontendUrl: value.FRONTEND_URL,
    databaseUrl: value.DATABASE_URL,
    supabaseUrl: value.SUPABASE_URL,
    supabaseKey: value.SUPABASE_KEY,
    supabaseJwtSecret: value.SUPABASE_JWT_SECRET,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    elasticsearchNode: value.ELASTICSEARCH_NODE,
    redisHost: value.REDIS_HOST,
    redisPort: value.REDIS_PORT,
    redisPassword: value.REDIS_PASSWORD,
    redisDb: value.REDIS_DB,
  };
};

export default (): AppConfig => {
  // Ensure dotenv is loaded
  require('dotenv').config();
  
  return validateConfig(process.env);
}; 