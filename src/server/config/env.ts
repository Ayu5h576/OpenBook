/**
 * Environment variable configuration for the OpenBook backend
 */

import 'dotenv/config';

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string): string | undefined {
  return process.env[key];
}

export const env = {
  // Database Configuration
  database: {
    url: getEnvVar('DATABASE_URL'),
  },

  // Token Configuration
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    accessTtl: getEnvVar('ACCESS_TOKEN_TTL', '15m'),
    refreshTtlDays: parseInt(getEnvVar('REFRESH_TOKEN_TTL_DAYS', '30'), 10),
  },

  // Application Configuration
  app: {
    port: parseInt(getEnvVar('API_PORT', '5173'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    appUrl: getEnvVar('APP_URL', 'http://localhost:5173'),
  },

  // Gemini Configuration (Optional)
  gemini: {
    apiKey: getOptionalEnvVar('GEMINI_API_KEY'),
  },

  // Google Books API Configuration (Optional)
  googleBooks: {
    apiKey: getOptionalEnvVar('GOOGLE_BOOKS_API_KEY'),
  },

  // Redis Configuration (Optional — enables distributed caching)
  redis: {
    url: getOptionalEnvVar('REDIS_URL'),
  },
};

// Validate required configuration on startup
export function validateEnv() {
  try {
    // Access all required fields to trigger validation
    env.database.url;
    env.jwt.secret;
    env.app.port;
    console.log('[Config] Environment variables validated successfully');
  } catch (error) {
    console.error('[Config] Environment validation failed:', error);
    process.exit(1);
  }
}
