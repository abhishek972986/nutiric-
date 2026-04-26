import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeekBounds } from '@/lib/leaderboard'

type ScoreRow = {
  user_id: string
  meals_logged: number
  goals_completed: number
  streak_days: number
  total_score: number
}

type PublicProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

function attachProfiles(entries: ScoreRow[] | null, profileMap: Map<string, PublicProfileRow>) {
  return (entries || []).map((entry) => ({
    ...entry,
    profile: profileMap.get(entry.user_id) || {
      id: entry.user_id,
      full_name: null,
      avatar_url: null,
    },
  }))
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

    const { weekStartStr } = getWeekBounds()

    const { data: globalScores } = await supabase
      .from('leaderboard_scores')
      .select('user_id, meals_logged, goals_completed, streak_days, total_score')
      .eq('week_start', weekStartStr)
      .order('total_score', { ascending: false })
      .limit(50)

    const { data: myScore } = await supabase
      .from('leaderboard_scores')
      .select('user_id, meals_logged, goals_completed, streak_days, total_score')
      .eq('week_start', weekStartStr)
      .eq('user_id', user.id)
      .maybeSingle<ScoreRow>()

    let currentUserRank: number | null = null
    if (myScore) {
      const { count: higherScoreCount } = await supabase
        .from('leaderboard_scores')
        .select('*', { count: 'exact', head: true })
        .eq('week_start', weekStartStr)
        .gt('total_score', myScore.total_score)

      currentUserRank = (higherScoreCount || 0) + 1
    }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const friendIds =
      friendships?.map((friendship) =>
        friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id,
      ) || []

    const friendAndSelfIds = Array.from(new Set([...friendIds, user.id]))

    const { data: friendScores } = friendAndSelfIds.length
      ? await supabase
          .from('leaderboard_scores')
          .select('user_id, meals_logged, goals_completed, streak_days, total_score')
          .eq('week_start', weekStartStr)
          .in('user_id', friendAndSelfIds)
          .order('total_score', { ascending: false })
      : { data: [] as ScoreRow[] }

    const profileIds = Array.from(
      new Set([
        ...(globalScores || []).map((entry) => entry.user_id),
        ...(friendScores || []).map((entry) => entry.user_id),
        user.id,
      ]),
    )

    const { data: profiles } = profileIds.length
      ? await supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', profileIds)
      : { data: [] as PublicProfileRow[] }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))

    return NextResponse.json({
      weekStart: weekStartStr,
      currentUserId: user.id,
      currentUserRank,
      currentUserScore: myScore?.total_score || 0,
      globalEntries: attachProfiles(globalScores as ScoreRow[] | null, profileMap),
      friendEntries: attachProfiles(friendScores as ScoreRow[] | null, profileMap),
    })
  } catch (error) {
    console.error('Leaderboard route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
