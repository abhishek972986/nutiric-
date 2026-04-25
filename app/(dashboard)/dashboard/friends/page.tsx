'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { UserPlus, Check, X, Users, Search, Clock } from 'lucide-react'

interface Friend {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  created_at: string
  profile: Friend
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
  const supabase = createClient()

  useEffect(() => {
    loadFriendsData()
  }, [])

  async function loadFriendsData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Get accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (friendships) {
      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', friendIds)

        setFriends(profiles || [])
      }
    }

    // Get pending requests (received)
    const { data: pending } = await supabase
      .from('friendships')
      .select('*')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    if (pending && pending.length > 0) {
      const requesterIds = pending.map((p) => p.requester_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', requesterIds)

      const requestsWithProfiles = pending.map((req) => ({
        ...req,
        profile: profiles?.find((p) => p.id === req.requester_id) || {
          id: req.requester_id,
          full_name: null,
          email: '',
          avatar_url: null,
        },
      }))
      setPendingRequests(requestsWithProfiles)
    }

    // Get sent requests
    const { data: sent } = await supabase
      .from('friendships')
      .select('*')
      .eq('requester_id', user.id)
      .eq('status', 'pending')

    if (sent && sent.length > 0) {
      const addresseeIds = sent.map((s) => s.addressee_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', addresseeIds)

      const requestsWithProfiles = sent.map((req) => ({
        ...req,
        profile: profiles?.find((p) => p.id === req.addressee_id) || {
          id: req.addressee_id,
          full_name: null,
          email: '',
          avatar_url: null,
        },
      }))
      setSentRequests(requestsWithProfiles)
    }

    setIsLoading(false)
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
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: currentUserId,
        addressee_id: friendId,
        status: 'pending',
      })

    if (error) {
      toast.error('Failed to send friend request')
    } else {
      toast.success('Friend request sent!')
      setSearchResult(null)
      setSearchEmail('')
      loadFriendsData()
    }
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    const { error } = await supabase
      .from('friendships')
      .update({
        status: accept ? 'accepted' : 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to respond to request')
    } else {
      toast.success(accept ? 'Friend request accepted!' : 'Friend request declined')
      loadFriendsData()
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
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
                  <p className="font-medium text-foreground">{searchResult.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{searchResult.email}</p>
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
                      <div>
                        <p className="font-medium text-foreground">{friend.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{friend.email}</p>
                      </div>
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
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(request.profile.full_name, request.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{request.profile.full_name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{request.profile.email}</p>
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
                        <AvatarImage src={request.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(request.profile.full_name, request.profile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{request.profile.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{request.profile.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                        Pending
                      </span>
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
