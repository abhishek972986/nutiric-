'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { UserPlus, Check, X, Users, Search, Clock, UserMinus } from 'lucide-react'

interface Friend {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  created_at: string
  profile: Friend | null
}

export default function FriendsPage() {
  const [searchEmail, setSearchEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<Friend | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    loadFriendsData()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('friends-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          loadFriendsData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadFriendsData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function loadFriendsData() {
    try {
      const response = await fetch('/api/friends')
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(result?.error || 'Failed to load friends')
        return
      }

      setCurrentUserId(result.currentUserId || null)
      setFriends(result.friends || [])
      setPendingRequests(result.pendingRequests || [])
      setSentRequests(result.sentRequests || [])
    } catch {
      toast.error('Failed to load friends data')
    } finally {
      setIsLoading(false)
    }
  }

  async function searchUser() {
    if (!searchEmail.trim()) return

    setIsSearching(true)
    setSearchResult(null)

    try {
      const response = await fetch('/api/friends/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: searchEmail }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to search user')
        return
      }

      const data = result.user as Friend | null

      if (data) {
        if (data.id === currentUserId) {
          toast.error("You can't add yourself as a friend")
        } else if (friends.some((f) => f.id === data.id)) {
          toast.info('You are already friends with this user')
        } else if (sentRequests.some((r) => r.addressee_id === data.id)) {
          toast.info('You already sent a friend request to this user')
        } else if (pendingRequests.some((r) => r.requester_id === data.id)) {
          toast.info('This user already sent you a request. Check Requests tab.')
        } else {
          setSearchResult(data)
        }
      } else {
        toast.error('User not found')
      }
    } catch {
      toast.error('Failed to search user')
    } finally {
      setIsSearching(false)
    }
  }

  async function sendFriendRequest(friendId: string) {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', friendId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(result?.error || 'Failed to send friend request')
      } else {
        toast.success('Friend request sent!')
        setSearchResult(null)
        setSearchEmail('')
        loadFriendsData()
      }
    } catch {
      toast.error('Failed to send friend request')
    }
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', requestId, accept }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(result?.error || 'Failed to respond to request')
      } else {
        toast.success(accept ? 'Friend request accepted!' : 'Friend request declined')
        loadFriendsData()
      }
    } catch {
      toast.error('Failed to respond to request')
    }
  }

  async function cancelRequest(requestId: string) {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', requestId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(result?.error || 'Failed to cancel request')
      } else {
        toast.success('Friend request canceled')
        loadFriendsData()
      }
    } catch {
      toast.error('Failed to cancel request')
    }
  }

  async function removeFriend(friendId: string) {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', friendId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(result?.error || 'Failed to remove friend')
      } else {
        toast.success('Friend removed')
        loadFriendsData()
      }
    } catch {
      toast.error('Failed to remove friend')
    }
  }

  const getInitials = (name: string | null, email?: string | null) => {
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

  const getDisplayEmail = (email?: string | null) => {
    return email || 'No email available'
  }

  const getDisplayName = (name?: string | null) => {
    return name || 'User'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Friends</h1>

      {/* Search */}
      <Card className="border-0 shadow-md mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Friend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            />
            <Button onClick={searchUser} disabled={isSearching}>
              {isSearching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {searchResult && (
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={searchResult.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(searchResult.full_name, searchResult.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{getDisplayName(searchResult.full_name)}</p>
                  <p className="text-xs text-muted-foreground">{getDisplayEmail(searchResult.email)}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => sendFriendRequest(searchResult.id)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="friends">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="friends">
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No friends yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Search by email to add friends</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(friend.full_name, friend.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{getDisplayName(friend.full_name)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getDisplayEmail(friend.email)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeFriend(friend.id)}>
                        <UserMinus className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar>
                          <AvatarImage src={request.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(request.profile?.full_name || null, request.profile?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{getDisplayName(request.profile?.full_name)}</p>
                          <p className="text-xs text-muted-foreground truncate">{getDisplayEmail(request.profile?.email)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => respondToRequest(request.id, true)}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => respondToRequest(request.id, false)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              {sentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No sent requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <Avatar>
                        <AvatarImage src={request.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(request.profile?.full_name || null, request.profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{getDisplayName(request.profile?.full_name)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getDisplayEmail(request.profile?.email)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => cancelRequest(request.id)}>
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
