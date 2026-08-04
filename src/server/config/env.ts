/**
 * Environment variable configuration for the OpenBook backend
 */

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
  // Supabase Configuration
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    serviceKey: getEnvVar('SUPABASE_SERVICE_KEY'),
    jwtSecret: getEnvVar('SUPABASE_JWT_SECRET'),
  },

  // Application Configuration
  app: {
    port: parseInt(getEnvVar('API_PORT', '3000'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    appUrl: getEnvVar('APP_URL', 'http://localhost:5173'),
  },

  // Gemini Configuration (Optional)
  gemini: {
    apiKey: getOptionalEnvVar('GEMINI_API_KEY'),
  },
};

// Validate required configuration on startup
export function validateEnv() {
  try {
    // Access all required fields to trigger validation
    env.supabase.url;
    env.supabase.serviceKey;
    env.supabase.jwtSecret;
    env.app.port;
    console.log('[Config] Environment variables validated successfully');
  } catch (error) {
    console.error('[Config] Environment validation failed:', error);
    process.exit(1);
  }
}
