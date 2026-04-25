import { createBrowserClient } from '@supabase/ssr'
import { createNoopSupabaseClient, hasSupabaseEnv } from './noop-client'

export function createClient() {
  if (!hasSupabaseEnv()) {
    return createNoopSupabaseClient()
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
