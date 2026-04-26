'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Award, Flame, Medal, Target, Trophy, Utensils } from 'lucide-react'

type LeaderboardEntry = {
  user_id: string
  meals_logged: number
  goals_completed: number
  streak_days: number
  total_score: number
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

type LeaderboardResponse = {
  weekStart: string
  currentUserId: string
  currentUserRank: number | null
  currentUserScore: number
  globalEntries: LeaderboardEntry[]
  friendEntries: LeaderboardEntry[]
}

function getInitials(name: string | null) {
  if (!name) {
    return 'U'
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>
}

function LeaderboardList({
  data,
  currentUserId,
}: {
  data: LeaderboardEntry[]
  currentUserId: string
}) {
  return (
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
        data.map((entry, index) => {
          const isCurrentUser = entry.user_id === currentUserId

          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-4 rounded-xl ${
                isCurrentUser ? 'bg-primary/10 border-2 border-primary' : 'bg-secondary'
              }`}
            >
              <div className="w-8 flex justify-center">{getRankIcon(index + 1)}</div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(entry.profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.profile.full_name || 'User'}
                  {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
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
          )
        })
      )}
    </div>
  )
}

export function LeaderboardClient() {
  const supabase = useMemo(() => createClient(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<LeaderboardResponse | null>(null)

  const loadLeaderboard = useCallback(
    async (showErrorToast = true) => {
      try {
        const response = await fetch('/api/leaderboard', {
          method: 'GET',
          cache: 'no-store',
        })

        const result = (await response.json().catch(() => null)) as LeaderboardResponse | { error?: string } | null

        if (!response.ok || !result || !('globalEntries' in result)) {
          if (showErrorToast) {
            toast.error((result as { error?: string } | null)?.error || 'Failed to load leaderboard')
          }
          return
        }

        setData(result)
      } catch {
        if (showErrorToast) {
          toast.error('Failed to load leaderboard')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadLeaderboard()

    const channel = supabase
      .channel('leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_scores' },
        () => loadLeaderboard(false),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => loadLeaderboard(false),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadLeaderboard(false),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadLeaderboard, supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const currentUserId = data?.currentUserId || ''

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h1>
      <p className="text-muted-foreground mb-6">Weekly rankings reset every Monday</p>

      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your Global Rank</p>
            <p className="text-2xl font-bold text-foreground">
              {data?.currentUserRank ? `#${data.currentUserRank}` : 'Unranked'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Your Weekly Score</p>
            <p className="text-xl font-bold text-primary">{data?.currentUserScore || 0}</p>
          </div>
        </CardContent>
      </Card>

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
              <LeaderboardList data={data?.globalEntries || []} currentUserId={currentUserId} />
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
              <LeaderboardList data={data?.friendEntries || []} currentUserId={currentUserId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
