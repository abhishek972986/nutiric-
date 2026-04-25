import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Leaf } from 'lucide-react'

interface DashboardHeaderProps {
  userName: string
  avatarUrl?: string | null
}

export function DashboardHeader({ userName, avatarUrl }: DashboardHeaderProps) {
  const firstName = userName.split(' ')[0]
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-xl font-bold text-foreground">{firstName}</h1>
        </div>
      </div>
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl || undefined} alt={userName} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials || 'U'}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
