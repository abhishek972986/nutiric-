import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface DayData {
  date: string
  meals: Array<{
    id: string
    meal_type: string
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    created_at: string
    food_items: Array<{ name: string }>
  }>
  totalCalories: number
  goalMet: boolean
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get profile for calorie goal
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_calorie_goal')
    .eq('id', user?.id)
    .single()

  const calorieGoal = profile?.daily_calorie_goal || 2000

  // Get meals from last 7 days
  const endDate = new Date()
  const startDate = subDays(endDate, 6)

  const { data: meals } = await supabase
    .from('meals')
    .select('*, food_items(name)')
    .eq('user_id', user?.id)
    .gte('created_at', startOfDay(startDate).toISOString())
    .lte('created_at', endOfDay(endDate).toISOString())
    .order('created_at', { ascending: false })

  // Group meals by day
  const dayDataMap = new Map<string, DayData>()

  // Initialize all 7 days
  for (let i = 0; i < 7; i++) {
    const date = subDays(endDate, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    dayDataMap.set(dateStr, {
      date: dateStr,
      meals: [],
      totalCalories: 0,
      goalMet: false,
    })
  }

  // Fill in meals
  meals?.forEach((meal) => {
    const dateStr = format(new Date(meal.created_at), 'yyyy-MM-dd')
    const dayData = dayDataMap.get(dateStr)
    if (dayData) {
      dayData.meals.push(meal)
      dayData.totalCalories += meal.total_calories || 0
    }
  })

  // Calculate goal met for each day
  dayDataMap.forEach((day) => {
    // Goal is met if within 10% of target
    const lowerBound = calorieGoal * 0.9
    const upperBound = calorieGoal * 1.1
    day.goalMet = day.totalCalories >= lowerBound && day.totalCalories <= upperBound
  })

  const daysData = Array.from(dayDataMap.values())

  // Calculate weekly stats
  const totalMeals = daysData.reduce((acc, d) => acc + d.meals.length, 0)
  const totalCalories = daysData.reduce((acc, d) => acc + d.totalCalories, 0)
  const avgCalories = Math.round(totalCalories / 7)
  const goalDays = daysData.filter((d) => d.goalMet).length

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Meal History</h1>
      <p className="text-muted-foreground mb-6">Your nutrition over the past 7 days</p>

      {/* Weekly Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Utensils className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalMeals}</p>
            <p className="text-xs text-muted-foreground">Meals Logged</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-chart-4 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{avgCalories}</p>
            <p className="text-xs text-muted-foreground">Avg Cal/Day</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            {avgCalories > calorieGoal ? (
              <TrendingUp className="h-5 w-5 text-chart-5 mx-auto mb-1" />
            ) : (
              <TrendingDown className="h-5 w-5 text-primary mx-auto mb-1" />
            )}
            <p className="text-2xl font-bold text-foreground">{goalDays}/7</p>
            <p className="text-xs text-muted-foreground">Goals Met</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <div className="space-y-4">
        {daysData.map((day) => {
          const date = new Date(day.date)
          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <Card key={day.date} className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isToday ? 'Today' : format(date, 'EEEE, MMM d')}
                    {day.goalMet && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        Goal Met
                      </Badge>
                    )}
                  </CardTitle>
                  <span className="text-lg font-bold text-foreground">
                    {day.totalCalories.toLocaleString()} cal
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {day.meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No meals logged</p>
                ) : (
                  <div className="space-y-2">
                    {day.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {mealTypeLabels[meal.meal_type] || 'Meal'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {meal.food_items?.map((f) => f.name).join(', ').slice(0, 40)}
                            {(meal.food_items?.map((f) => f.name).join(', ').length || 0) > 40 && '...'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground text-sm">{meal.total_calories} cal</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(meal.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
