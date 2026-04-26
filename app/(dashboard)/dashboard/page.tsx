import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DailyProgress } from '@/components/dashboard/daily-progress'
import { TodaysMeals } from '@/components/dashboard/todays-meals'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { StreakCard } from '@/components/dashboard/streak-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }
  
  // Get profile data
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [profileResult, mealsResult, streakResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('meals')
      .select('*, food_items(*)')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  const profile = profileResult.data
  const meals = mealsResult.data
  const streakData = streakResult.data

  // Calculate totals
  const totals = meals?.reduce((acc, meal) => ({
    calories: acc.calories + (meal.total_calories || 0),
    protein: acc.protein + (meal.total_protein || 0),
    carbs: acc.carbs + (meal.total_carbs || 0),
    fat: acc.fat + (meal.total_fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <DashboardHeader 
        userName={profile?.full_name || 'there'} 
        avatarUrl={profile?.avatar_url}
      />
      
      <div className="space-y-6 mt-6">
        <DailyProgress 
          consumed={totals.calories}
          goal={profile?.daily_calorie_goal || 2000}
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />

        <StreakCard 
          currentStreak={streakData?.current_streak || 0}
          longestStreak={streakData?.longest_streak || 0}
        />
        
        <QuickActions />
        
        <TodaysMeals meals={meals || []} />
      </div>
    </div>
  )
}
