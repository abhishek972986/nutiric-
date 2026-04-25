'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Camera, ImageIcon, X, Check, Edit2, Trash2, Plus, ArrowLeft, Utensils, Zap, Info } from 'lucide-react'

interface FoodItem {
  name: string
  quantity: string
  weight_grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface AnalysisResult {
  items: FoodItem[]
  total: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

type Step = 'upload' | 'analyzing' | 'results'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  if (error && typeof error === 'object' && 'error' in error) {
    const message = (error as { error?: string }).error
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

function buildPublicImagePayload(imageData: string | null) {
  if (!imageData) {
    return undefined
  }
  return imageData.slice(0, 2000)
}

export default function ScanMealPage() {
  const [step, setStep] = useState<Step>('upload')
  const [image, setImage] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [mealType, setMealType] = useState<string>('lunch')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<FoodItem>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [manualItem, setManualItem] = useState<Partial<FoodItem>>({
    name: '',
    quantity: '1 serving',
    weight_grams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image too large. Please use an image under 10MB.')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImage(result)
        analyzeImage(result)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const analyzeImage = async (imageData: string) => {
    setStep('analyzing')
    
    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }

      const data = await response.json()

      if (data.warning) {
        toast.warning(data.warning)
      }
      
      if (data.items && data.items.length > 0) {
        setAnalysis(data)
        setStep('results')
        toast.success(`Found ${data.items.length} food item${data.items.length > 1 ? 's' : ''}!`)
      } else {
        toast.error('No food items detected. Try a clearer photo or add items manually.')
        setAnalysis({ items: [], total: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        setStep('results')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze meal')
      setStep('upload')
      setImage(null)
    }
  }

  const startEditing = (index: number) => {
    if (!analysis) return
    setEditingIndex(index)
    setEditValues({ ...analysis.items[index] })
  }

  const saveEdit = () => {
    if (!analysis || editingIndex === null) return
    
    const newItems = [...analysis.items]
    newItems[editingIndex] = { ...newItems[editingIndex], ...editValues } as FoodItem
    
    const total = calculateTotals(newItems)
    setAnalysis({ items: newItems, total })
    setEditingIndex(null)
    setEditValues({})
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditValues({})
  }

  const removeItem = (index: number) => {
    if (!analysis) return
    
    const newItems = analysis.items.filter((_, i) => i !== index)
    const total = calculateTotals(newItems)
    setAnalysis({ items: newItems, total })
  }

  const addManualItem = () => {
    if (!manualItem.name || !manualItem.calories) {
      toast.error('Please enter at least a name and calories')
      return
    }
    
    const newItem: FoodItem = {
      name: manualItem.name || '',
      quantity: manualItem.quantity || '1 serving',
      weight_grams: manualItem.weight_grams || 100,
      calories: manualItem.calories || 0,
      protein: manualItem.protein || 0,
      carbs: manualItem.carbs || 0,
      fat: manualItem.fat || 0,
    }
    
    const currentItems = analysis?.items || []
    const newItems = [...currentItems, newItem]
    const total = calculateTotals(newItems)
    
    setAnalysis({ items: newItems, total })
    setIsAddingManual(false)
    setManualItem({
      name: '',
      quantity: '1 serving',
      weight_grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    })
    toast.success('Food item added!')
  }

  const calculateTotals = (items: FoodItem[]) => {
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  const saveMeal = async () => {
    if (!analysis || analysis.items.length === 0) {
      toast.error('Add at least one food item')
      return
    }

    setIsSaving(true)
    try {
      const normalizedItems = analysis.items
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          quantity: item.quantity?.trim() || '1 serving',
          weight_grams: Number(item.weight_grams) || 0,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        }))
        .filter((item) => item.name.length > 0)

      if (normalizedItems.length === 0) {
        toast.error('Add at least one valid food item')
        return
      }

      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealType,
          imageUrl: buildPublicImagePayload(image),
          items: normalizedItems,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please log in to save meals')
          router.push('/auth/login')
          return
        }

        const message = getErrorMessage(payload, 'Failed to save meal. Please try again.')
        toast.error(message)
        return
      }

      toast.success('Meal saved to log successfully!')
      router.push('/dashboard/history')
    } catch (error) {
      console.error('Save error:', error)
      toast.error(getErrorMessage(error, 'Failed to save meal. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const resetScan = () => {
    setImage(null)
    setAnalysis(null)
    setStep('upload')
    setEditingIndex(null)
    setEditValues({})
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Scan Meal</h1>
            <p className="text-sm text-muted-foreground">AI-powered nutrition analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <>
            {/* Upload Options */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-border">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">Take Photo</span>
                    <span className="text-xs text-muted-foreground mt-1">Use camera</span>
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">Gallery</span>
                    <span className="text-xs text-muted-foreground mt-1">Choose photo</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Manual Entry Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-14"
              onClick={() => {
                setStep('results')
                setAnalysis({ items: [], total: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
              }}
            >
              <Utensils className="h-5 w-5 mr-2" />
              Enter Food Manually
            </Button>

            {/* Tips */}
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Tips for best results</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li>Take photos in good lighting</li>
                      <li>Include the entire plate in frame</li>
                      <li>Avoid blurry or dark images</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              {image && (
                <div className="relative mb-6 rounded-xl overflow-hidden">
                  <img
                    src={image}
                    alt="Meal being analyzed"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Spinner className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Analyzing your meal...</p>
                      <p className="text-sm opacity-80">This may take a few seconds</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <>
            {/* Image Preview */}
            {image && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="relative">
                  <img
                    src={image}
                    alt="Meal"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 rounded-full"
                    onClick={resetScan}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Meal Type */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 pb-4">
                <Label className="text-sm font-medium mb-2 block">Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Food Items */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Food Items</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingManual(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {analysis && analysis.items.length === 0 && !isAddingManual && (
                  <CardDescription>No items yet. Add food items manually.</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Manual Add Form */}
                {isAddingManual && (
                  <div className="p-4 bg-primary/5 rounded-xl space-y-3 border border-primary/20">
                    <Input
                      placeholder="Food name (e.g., Grilled Chicken)"
                      value={manualItem.name}
                      onChange={(e) => setManualItem(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Calories"
                        value={manualItem.calories || ''}
                        onChange={(e) => setManualItem(prev => ({ ...prev, calories: Number(e.target.value) }))}
                      />
                      <Input
                        type="number"
                        placeholder="Protein (g)"
                        value={manualItem.protein || ''}
                        onChange={(e) => setManualItem(prev => ({ ...prev, protein: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Carbs (g)"
                        value={manualItem.carbs || ''}
                        onChange={(e) => setManualItem(prev => ({ ...prev, carbs: Number(e.target.value) }))}
                      />
                      <Input
                        type="number"
                        placeholder="Fat (g)"
                        value={manualItem.fat || ''}
                        onChange={(e) => setManualItem(prev => ({ ...prev, fat: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addManualItem} className="flex-1">
                        <Check className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingManual(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Food Items List */}
                {analysis?.items.map((item, index) => (
                  <div key={index} className="p-4 bg-secondary/50 rounded-xl">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <Input
                          value={editValues.name || ''}
                          onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Food name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Calories</Label>
                            <Input
                              type="number"
                              value={editValues.calories || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, calories: Number(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                            <Input
                              type="number"
                              value={editValues.protein || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, protein: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                            <Input
                              type="number"
                              value={editValues.carbs || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, carbs: Number(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                            <Input
                              type="number"
                              value={editValues.fat || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, fat: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {item.weight_grams > 0 && `(~${item.weight_grams}g)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-foreground">{Math.round(item.calories)}</p>
                            <p className="text-xs text-muted-foreground">cal</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(index)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Nutrition Summary */}
            {analysis && analysis.items.length > 0 && (
              <Card className="border-0 shadow-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <p className="text-sm opacity-80 mb-1">Total Calories</p>
                    <p className="text-5xl font-bold">{Math.round(analysis.total.calories)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-2xl font-bold">{Math.round(analysis.total.protein)}g</p>
                      <p className="text-xs opacity-80">Protein</p>
                    </div>
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-2xl font-bold">{Math.round(analysis.total.carbs)}g</p>
                      <p className="text-xs opacity-80">Carbs</p>
                    </div>
                    <div className="text-center p-3 bg-white/10 rounded-xl">
                      <p className="text-2xl font-bold">{Math.round(analysis.total.fat)}g</p>
                      <p className="text-xs opacity-80">Fat</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={resetScan}>
                Start Over
              </Button>
              <Button 
                className="flex-1 h-12" 
                onClick={saveMeal} 
                disabled={isSaving || !analysis || analysis.items.length === 0}
              >
                {isSaving ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Log Meal
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
