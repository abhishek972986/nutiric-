import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const friendActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    friendId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('respond'),
    requestId: z.string().uuid(),
    accept: z.boolean(),
  }),
  z.object({
    action: z.literal('cancel'),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('remove'),
    friendId: z.string().uuid(),
  }),
])

function pairFilter(userId: string, otherId: string) {
  return `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: accepted } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status, created_at, updated_at')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const { data: pendingReceived } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status, created_at, updated_at')
      .eq('status', 'pending')
      .eq('addressee_id', user.id)

    const { data: pendingSent } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status, created_at, updated_at')
      .eq('status', 'pending')
      .eq('requester_id', user.id)

    const profileIds = new Set<string>()
    accepted?.forEach((row) => {
      profileIds.add(row.requester_id)
      profileIds.add(row.addressee_id)
    })
    pendingReceived?.forEach((row) => profileIds.add(row.requester_id))
    pendingSent?.forEach((row) => profileIds.add(row.addressee_id))

    const ids = Array.from(profileIds)
    const { data: profiles } = ids.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', ids)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }> }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))

    const friends =
      accepted?.map((row) => {
        const friendId = row.requester_id === user.id ? row.addressee_id : row.requester_id
        return profileMap.get(friendId)
      }).filter(Boolean) || []

    const pendingRequests =
      pendingReceived?.map((row) => ({
        ...row,
        profile: profileMap.get(row.requester_id) || null,
      })) || []

    const sentRequests =
      pendingSent?.map((row) => ({
        ...row,
        profile: profileMap.get(row.addressee_id) || null,
      })) || []

    return NextResponse.json({
      friends,
      pendingRequests,
      sentRequests,
      currentUserId: user.id,
    })
  } catch (error) {
    console.error('Load friends route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = friendActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (parsed.data.action === 'send') {
      if (parsed.data.friendId === user.id) {
        return NextResponse.json({ error: 'You cannot add yourself' }, { status: 400 })
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(pairFilter(user.id, parsed.data.friendId))

      const active = existing?.find((row) => row.status === 'accepted' || row.status === 'pending')
      if (active) {
        return NextResponse.json({ error: 'Friendship already exists or is pending' }, { status: 409 })
      }

      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: parsed.data.friendId,
        status: 'pending',
      })

      if (error) {
        console.error('Send friend request error:', error)
        return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (parsed.data.action === 'respond') {
      const { error } = await supabase
        .from('friendships')
        .update({
          status: parsed.data.accept ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', parsed.data.requestId)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Respond to request error:', error)
        return NextResponse.json({ error: 'Failed to respond to request' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (parsed.data.action === 'cancel') {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', parsed.data.requestId)
        .eq('requester_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Cancel request error:', error)
        return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('status', 'accepted')
      .or(pairFilter(user.id, parsed.data.friendId))

    if (error) {
      console.error('Remove friend error:', error)
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Friends action route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
