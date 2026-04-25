'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface DailyProgressProps {
  consumed: number
  goal: number
  protein: number
  carbs: number
  fat: number
}

export function DailyProgress({ consumed, goal, protein, carbs, fat }: DailyProgressProps) {
  const percentage = Math.min((consumed / goal) * 100, 100)
  const remaining = Math.max(goal - consumed, 0)

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Today&apos;s Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-foreground">{consumed.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">/ {goal.toLocaleString()} cal</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Remaining</span>
            <p className="text-lg font-semibold text-primary">{remaining.toLocaleString()}</p>
          </div>
        </div>
        
        <Progress value={percentage} className="h-3" />

        <div className="grid grid-cols-3 gap-4 pt-2">
          <MacroItem label="Protein" value={protein} unit="g" color="bg-chart-1" />
          <MacroItem label="Carbs" value={carbs} unit="g" color="bg-chart-4" />
          <MacroItem label="Fat" value={fat} unit="g" color="bg-chart-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function MacroItem({ 
  label, 
  value, 
  unit, 
  color 
}: { 
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className="text-center">
      <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1`} />
      <p className="text-lg font-semibold text-foreground">{Math.round(value)}{unit}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
