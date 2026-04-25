import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Medal, Award, Flame, Target, Utensils } from 'lucide-react'

interface LeaderboardEntry {
  user_id: string
  meals_logged: number
  goals_completed: number
  streak_days: number
  total_score: number
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string
  }
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current week start
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // Get leaderboard data
  const { data: leaderboardData } = await supabase
    .from('leaderboard_scores')
    .select('user_id, meals_logged, goals_completed, streak_days, total_score')
    .eq('week_start', weekStartStr)
    .order('total_score', { ascending: false })
    .limit(50)

  // Get profiles for leaderboard users
  let entries: LeaderboardEntry[] = []
  if (leaderboardData && leaderboardData.length > 0) {
    const userIds = leaderboardData.map((l) => l.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds)

    entries = leaderboardData.map((entry) => ({
      ...entry,
      profile: profiles?.find((p) => p.id === entry.user_id) || {
        full_name: null,
        avatar_url: null,
        email: '',
      },
    }))
  }

  // Get user's friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`)

  const friendIds = friendships?.map((f) =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  ) || []
  friendIds.push(user?.id || '')

  const friendEntries = entries.filter((e) => friendIds.includes(e.user_id))

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email?.[0]?.toUpperCase() || 'U'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>
  }

  const LeaderboardList = ({ data, isCurrentUser }: { data: LeaderboardEntry[], isCurrentUser?: (id: string) => boolean }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No entries yet this week</p>
          <p className="text-sm text-muted-foreground mt-1">Log meals to start competing!</p>
        </div>
      ) : (
        data.map((entry, index) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-4 rounded-xl ${
              isCurrentUser?.(entry.user_id)
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-secondary'
            }`}
          >
            <div className="w-8 flex justify-center">{getRankIcon(index + 1)}</div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(entry.profile.full_name, entry.profile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {entry.profile.full_name || 'User'}
                {isCurrentUser?.(entry.user_id) && (
                  <span className="ml-2 text-xs text-primary">(You)</span>
                )}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  {entry.meals_logged} meals
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {entry.streak_days}d streak
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{entry.total_score}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h1>
      <p className="text-muted-foreground mb-6">Weekly rankings reset every Monday</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Utensils className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Meals Logged</p>
            <p className="text-lg font-bold text-foreground">+10 pts</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-chart-4 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Goals Met</p>
            <p className="text-lg font-bold text-foreground">+25 pts</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-chart-5 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Streak Day</p>
            <p className="text-lg font-bold text-foreground">+5 pts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="global">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Players This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList 
                data={entries} 
                isCurrentUser={(id) => id === user?.id} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friends">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Friends Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList 
                data={friendEntries} 
                isCurrentUser={(id) => id === user?.id} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
