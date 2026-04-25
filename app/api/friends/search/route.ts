import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

type SearchPayload = {
  email?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as SearchPayload
    const normalizedEmail = body.email?.trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase search is not configured' },
        { status: 500 },
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.error('Friend search error:', error)
      return NextResponse.json({ error: 'Failed to search user' }, { status: 500 })
    }

    return NextResponse.json({ user: data ?? null })
  } catch (error) {
    console.error('Friend search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}