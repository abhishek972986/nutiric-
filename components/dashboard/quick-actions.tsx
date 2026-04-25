import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Calculator, History, Trophy } from 'lucide-react'

const actions = [
  { 
    href: '/dashboard/scan', 
    icon: Camera, 
    label: 'Scan Meal', 
    color: 'bg-primary/10 text-primary' 
  },
  { 
    href: '/dashboard/calculator', 
    icon: Calculator, 
    label: 'Calculator', 
    color: 'bg-chart-4/20 text-chart-4' 
  },
  { 
    href: '/dashboard/history', 
    icon: History, 
    label: 'History', 
    color: 'bg-chart-2/20 text-chart-2' 
  },
  { 
    href: '/dashboard/leaderboard', 
    icon: Trophy, 
    label: 'Leaderboard', 
    color: 'bg-chart-5/20 text-chart-5' 
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-3 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
