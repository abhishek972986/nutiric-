import { createClient } from '@/lib/supabase/server'
import { recomputeWeeklyScore } from '@/lib/leaderboard'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const score = await recomputeWeeklyScore(supabase, user.id)
    const { error } = score

    if (error) {
      console.error('Error updating score:', error)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    return NextResponse.json({
      mealsLogged: score.mealsLogged,
      goalsCompleted: score.goalsCompleted,
      streakDays: score.streakDays,
      totalScore: score.totalScore,
    })
  } catch (error) {
    console.error('Score update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
