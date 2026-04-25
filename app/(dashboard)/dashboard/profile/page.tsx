'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { LogOut, Save, User, Target } from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  gender: string | null
  activity_level: string | null
  daily_calorie_goal: number | null
  daily_protein_goal: number | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    height_cm: '',
    weight_kg: '',
    age: '',
    gender: '',
    activity_level: '',
    daily_calorie_goal: '',
    daily_protein_goal: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFormData({
          full_name: data.full_name || '',
          height_cm: data.height_cm?.toString() || '',
          weight_kg: data.weight_kg?.toString() || '',
          age: data.age?.toString() || '',
          gender: data.gender || '',
          activity_level: data.activity_level || '',
          daily_calorie_goal: data.daily_calorie_goal?.toString() || '2000',
          daily_protein_goal: data.daily_protein_goal?.toString() || '50',
        })
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name || null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        activity_level: formData.activity_level || null,
        daily_calorie_goal: formData.daily_calorie_goal ? parseInt(formData.daily_calorie_goal) : 2000,
        daily_protein_goal: formData.daily_protein_goal ? parseInt(formData.daily_protein_goal) : 50,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setIsSaving(false)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated successfully')
      router.refresh()
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const initials = formData.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>

      {/* Avatar Section */}
      <Card className="border-0 shadow-md mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-foreground">{formData.full_name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="border-0 shadow-md mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                placeholder="170"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(v) => setFormData({ ...formData, gender: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select
              value={formData.activity_level}
              onValueChange={(v) => setFormData({ ...formData, activity_level: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="lightly_active">Lightly Active</SelectItem>
                <SelectItem value="moderately_active">Moderately Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
                <SelectItem value="extra_active">Extra Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="border-0 shadow-md mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Daily Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calorie Goal</Label>
              <Input
                id="calories"
                type="number"
                value={formData.daily_calorie_goal}
                onChange={(e) => setFormData({ ...formData, daily_calorie_goal: e.target.value })}
                placeholder="2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Protein Goal (g)</Label>
              <Input
                id="protein"
                type="number"
                value={formData.daily_protein_goal}
                onChange={(e) => setFormData({ ...formData, daily_protein_goal: e.target.value })}
                placeholder="50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
        <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
