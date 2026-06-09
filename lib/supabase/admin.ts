import { createClient } from '@supabase/supabase-js'

/**
 * Admin client using the service_role key.
 * ONLY use server-side — never expose to the client.
 * Bypasses RLS and can access auth.users metadata.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
