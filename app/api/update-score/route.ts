import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current week start (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(now)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Get week end (Sunday)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Count meals logged this week
    const { count: mealsLogged } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())

    // Get user's streak
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single()

    // Get profile for calorie goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_calorie_goal')
      .eq('id', user.id)
      .single()

    const calorieGoal = profile?.daily_calorie_goal || 2000

    // Calculate goals completed (days where calories were within 10% of goal)
    const { data: dailyMeals } = await supabase
      .from('meals')
      .select('created_at, total_calories')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())

    // Group by day and sum calories
    const dailyCalories = new Map<string, number>()
    dailyMeals?.forEach((meal) => {
      const day = meal.created_at.split('T')[0]
      dailyCalories.set(day, (dailyCalories.get(day) || 0) + meal.total_calories)
    })

    let goalsCompleted = 0
    dailyCalories.forEach((calories) => {
      const lowerBound = calorieGoal * 0.9
      const upperBound = calorieGoal * 1.1
      if (calories >= lowerBound && calories <= upperBound) {
        goalsCompleted++
      }
    })

    // Calculate total score
    const mealsPoints = (mealsLogged || 0) * 10
    const goalsPoints = goalsCompleted * 25
    const streakPoints = (streak?.current_streak || 0) * 5
    const totalScore = mealsPoints + goalsPoints + streakPoints

    // Upsert leaderboard score
    const { error } = await supabase
      .from('leaderboard_scores')
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        meals_logged: mealsLogged || 0,
        goals_completed: goalsCompleted,
        streak_days: streak?.current_streak || 0,
        total_score: totalScore,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,week_start',
      })

    if (error) {
      console.error('Error updating score:', error)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    return NextResponse.json({
      mealsLogged: mealsLogged || 0,
      goalsCompleted,
      streakDays: streak?.current_streak || 0,
      totalScore,
    })
  } catch (error) {
    console.error('Score update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
