import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Utensils } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Meal {
  id: string
  meal_type: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  created_at: string
  food_items: Array<{ name: string }>
}

interface TodaysMealsProps {
  meals: Meal[]
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export function TodaysMeals({ meals }: TodaysMealsProps) {
  if (meals.length === 0) {
    return (
      <Card className="border-0 shadow-md bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Today&apos;s Meals</CardTitle>
          <Button size="sm" asChild>
            <Link href="/dashboard/scan">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Utensils className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No meals logged yet today</p>
            <p className="text-sm text-muted-foreground mt-1">Scan your first meal to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Today&apos;s Meals</CardTitle>
        <Button size="sm" asChild>
          <Link href="/dashboard/scan">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="flex items-center justify-between p-3 bg-secondary rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {mealTypeLabels[meal.meal_type] || 'Meal'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {meal.food_items?.length || 0} items &bull;{' '}
                  {formatDistanceToNow(new Date(meal.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{meal.total_calories} cal</p>
              <p className="text-xs text-muted-foreground">
                P:{Math.round(meal.total_protein)}g C:{Math.round(meal.total_carbs)}g F:{Math.round(meal.total_fat)}g
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
