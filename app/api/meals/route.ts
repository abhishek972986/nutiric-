import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { recomputeWeeklyScore } from '@/lib/leaderboard'

const mealItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1),
  weight_grams: z.number().nonnegative(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
})

const saveMealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  imageUrl: z.string().optional(),
  items: z.array(mealItemSchema).min(1),
})

type MealItem = z.infer<typeof mealItemSchema>

function getSupabaseErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code
    if (typeof code === 'string') {
      return code
    }
  }
  return null
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeItems(items: MealItem[]) {
  return items
    .map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity.trim() || '1 serving',
      weight_grams: round1(item.weight_grams),
      calories: round1(item.calories),
      protein: round1(item.protein),
      carbs: round1(item.carbs),
      fat: round1(item.fat),
    }))
    .filter((item) => item.name.length > 0)
}

function computeTotals(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: round1(acc.calories + item.calories),
      protein: round1(acc.protein + item.protein),
      carbs: round1(acc.carbs + item.carbs),
      fat: round1(acc.fat + item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function yesterdayIso() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
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
    const parsed = saveMealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const normalizedItems = normalizeItems(parsed.data.items)
    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'No valid food items were provided' }, { status: 400 })
    }

    const totals = computeTotals(normalizedItems)

    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        meal_type: parsed.data.mealType,
        image_url: parsed.data.imageUrl || null,
        total_calories: Math.round(totals.calories),
        total_protein: round1(totals.protein),
        total_carbs: round1(totals.carbs),
        total_fat: round1(totals.fat),
      })
      .select('id')
      .single()

    if (mealError || !meal) {
      console.error('Failed to insert meal:', mealError)

      if (getSupabaseErrorCode(mealError) === 'PGRST205') {
        return NextResponse.json(
          {
            error:
              'Database tables are not initialized yet. Run scripts/001_create_schema.sql in your Supabase SQL editor, then try again.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ error: 'Failed to save meal' }, { status: 500 })
    }

    const foodItems = normalizedItems.map((item) => ({
      meal_id: meal.id,
      user_id: user.id,
      name: item.name,
      quantity: item.quantity,
      weight_grams: item.weight_grams,
      calories: Math.round(item.calories),
      protein: round1(item.protein),
      carbs: round1(item.carbs),
      fat: round1(item.fat),
    }))

    const { error: itemsError } = await supabase.from('food_items').insert(foodItems)

    if (itemsError) {
      await supabase.from('meals').delete().eq('id', meal.id)
      console.error('Failed to insert food items:', itemsError)

      if (getSupabaseErrorCode(itemsError) === 'PGRST205') {
        return NextResponse.json(
          {
            error:
              'Database tables are not initialized yet. Run scripts/001_create_schema.sql in your Supabase SQL editor, then try again.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ error: 'Failed to save meal items' }, { status: 500 })
    }

    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_log_date')
      .eq('user_id', user.id)
      .maybeSingle()

    const today = todayIso()
    const yesterday = yesterdayIso()

    if (!streak) {
      const { error: createStreakError } = await supabase.from('user_streaks').upsert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_log_date: today,
        updated_at: new Date().toISOString(),
      })

      if (createStreakError) {
        console.error('Failed to create streak:', createStreakError)
      }
    } else if (streak.last_log_date !== today) {
      const nextStreak = streak.last_log_date === yesterday ? streak.current_streak + 1 : 1
      const longestStreak = Math.max(nextStreak, streak.longest_streak || 0)

      const { error: updateStreakError } = await supabase
        .from('user_streaks')
        .update({
          current_streak: nextStreak,
          longest_streak: longestStreak,
          last_log_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateStreakError) {
        console.error('Failed to update streak:', updateStreakError)
      }
    }

    const score = await recomputeWeeklyScore(supabase, user.id)
    if (score.error) {
      console.error('Failed to update leaderboard score:', score.error)
    }

    return NextResponse.json({
      mealId: meal.id,
      totals,
      leaderboard: {
        weekStart: score.weekStartStr,
        totalScore: score.totalScore,
      },
    })
  } catch (error) {
    console.error('Save meal route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
