'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Scale, Activity, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HealthMetrics {
  bmi: number
  bmiCategory: string
  bmr: number
  tdee: number
  weightLoss: number
  weightMaintain: number
  weightGain: number
}

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { value: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
  { value: 'extra_active', label: 'Extra Active', description: 'Very hard exercise & physical job', multiplier: 1.9 },
]

function calculateMetrics(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string
): HealthMetrics {
  // BMI calculation
  const heightInMeters = height / 100
  const bmi = weight / (heightInMeters * heightInMeters)

  // BMI category
  let bmiCategory = ''
  if (bmi < 18.5) bmiCategory = 'Underweight'
  else if (bmi < 25) bmiCategory = 'Normal'
  else if (bmi < 30) bmiCategory = 'Overweight'
  else bmiCategory = 'Obese'

  // BMR calculation (Mifflin-St Jeor Equation)
  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  }

  // TDEE calculation
  const activity = activityLevels.find((a) => a.value === activityLevel)
  const tdee = bmr * (activity?.multiplier || 1.2)

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    weightLoss: Math.round(tdee - 500),
    weightMaintain: Math.round(tdee),
    weightGain: Math.round(tdee + 500),
  }
}

export default function CalculatorPage() {
  const [weight, setWeight] = useState<string>('70')
  const [height, setHeight] = useState<string>('170')
  const [age, setAge] = useState<string>('30')
  const [gender, setGender] = useState<string>('male')
  const [activityLevel, setActivityLevel] = useState<string>('moderately_active')
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)

  useEffect(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age)

    if (w > 0 && h > 0 && a > 0) {
      setMetrics(calculateMetrics(w, h, a, gender, activityLevel))
    }
  }, [weight, height, age, gender, activityLevel])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Health Calculator</h1>
      <p className="text-muted-foreground mb-6">Calculate your BMI, BMR, and daily calorie needs</p>

      <Card className="border-0 shadow-md mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {activityLevels.find((l) => l.value === activityLevel)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Calorie Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* BMI Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Scale className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Body Mass Index</p>
                    <p className="text-3xl font-bold text-foreground">{metrics.bmi}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    metrics.bmiCategory === 'Normal'
                      ? 'bg-primary/10 text-primary'
                      : metrics.bmiCategory === 'Underweight'
                      ? 'bg-chart-2/20 text-chart-2'
                      : 'bg-chart-5/20 text-chart-5'
                  }`}>
                    {metrics.bmiCategory}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BMR Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-chart-4/20 rounded-xl flex items-center justify-center">
                    <Activity className="h-7 w-7 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Basal Metabolic Rate</p>
                    <p className="text-3xl font-bold text-foreground">{metrics.bmr.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">calories/day at rest</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TDEE Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-chart-1/20 rounded-xl flex items-center justify-center">
                    <Target className="h-7 w-7 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Daily Energy Expenditure</p>
                    <p className="text-3xl font-bold text-foreground">{metrics.tdee.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">calories/day with activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Daily Calorie Targets</CardTitle>
                <CardDescription>Based on your TDEE of {metrics.tdee.toLocaleString()} cal/day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Weight Loss */}
                <div className="flex items-center justify-between p-4 bg-chart-5/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-chart-5/20 rounded-lg flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-chart-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Weight Loss</p>
                      <p className="text-xs text-muted-foreground">~0.5 kg per week</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{metrics.weightLoss.toLocaleString()} cal</p>
                </div>

                {/* Maintain */}
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Minus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Maintain Weight</p>
                      <p className="text-xs text-muted-foreground">Stay at current weight</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{metrics.weightMaintain.toLocaleString()} cal</p>
                </div>

                {/* Weight Gain */}
                <div className="flex items-center justify-between p-4 bg-chart-4/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-chart-4/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Weight Gain</p>
                      <p className="text-xs text-muted-foreground">~0.5 kg per week</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{metrics.weightGain.toLocaleString()} cal</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
