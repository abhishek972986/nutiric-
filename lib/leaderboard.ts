type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => any
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<{ error: unknown }>
  }
}

export function getWeekBounds(referenceDate = new Date()) {
  const now = new Date(referenceDate)
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)

  const weekStart = new Date(now)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return {
    weekStart,
    weekEnd,
    weekStartStr: weekStart.toISOString().split('T')[0],
  }
}

export async function recomputeWeeklyScore(supabase: SupabaseLike, userId: string) {
  const { weekStart, weekEnd, weekStartStr } = getWeekBounds()

  const { count: mealsLogged } = await supabase
    .from('meals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_calorie_goal')
    .eq('id', userId)
    .single()

  const calorieGoal = profile?.daily_calorie_goal || 2000

  const { data: dailyMeals } = await supabase
    .from('meals')
    .select('created_at, total_calories')
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  const dailyCalories = new Map<string, number>()
  dailyMeals?.forEach((meal: { created_at: string; total_calories: number }) => {
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

  const mealsPoints = (mealsLogged || 0) * 10
  const goalsPoints = goalsCompleted * 25
  const streakPoints = (streak?.current_streak || 0) * 5
  const totalScore = mealsPoints + goalsPoints + streakPoints

  const { error } = await supabase
    .from('leaderboard_scores')
    .upsert(
      {
        user_id: userId,
        week_start: weekStartStr,
        meals_logged: mealsLogged || 0,
        goals_completed: goalsCompleted,
        streak_days: streak?.current_streak || 0,
        total_score: totalScore,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,week_start',
      },
    )

  if (error) {
    return {
      error,
      weekStartStr,
      mealsLogged: mealsLogged || 0,
      goalsCompleted,
      streakDays: streak?.current_streak || 0,
      totalScore,
    }
  }

  return {
    error: null,
    weekStartStr,
    mealsLogged: mealsLogged || 0,
    goalsCompleted,
    streakDays: streak?.current_streak || 0,
    totalScore,
  }
}
