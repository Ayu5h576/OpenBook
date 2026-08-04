/**
 * Supabase server client configuration
 * Used for server-side operations with elevated privileges (service_role)
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Get a Supabase client for a specific user (using their auth token)
 * Used for operations that should respect row-level security
 */
export function getSupabaseClient(accessToken: string) {
  return createClient(
    env.supabase.url,
    env.supabase.serviceKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export type Database = any; // TODO: Generate types from Supabase schema
