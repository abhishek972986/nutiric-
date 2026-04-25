import { Card, CardContent } from '@/components/ui/card'
import { Flame, Trophy } from 'lucide-react'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-0 shadow-md bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-chart-5/20 rounded-xl flex items-center justify-center">
              <Flame className="h-5 w-5 text-chart-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-chart-4/20 rounded-xl flex items-center justify-center">
              <Trophy className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
