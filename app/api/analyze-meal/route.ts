import { NextResponse } from 'next/server'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1),
  weight_grams: z.number().nonnegative(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
})

const geminiResponseSchema = z.object({
  items: z.array(foodItemSchema),
})

type FoodItem = z.infer<typeof foodItemSchema>

const analyzeBodySchema = z.union([
  z.object({ image: z.string().min(1) }),
  z.object({ foodName: z.string().min(1), quantity: z.string().min(1) }),
])

function extractImageParts(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    return null
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  }
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return null
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeItem(item: FoodItem): FoodItem {
  return {
    name: item.name.trim(),
    quantity: item.quantity.trim(),
    weight_grams: round1(item.weight_grams),
    calories: round1(item.calories),
    protein: round1(item.protein),
    carbs: round1(item.carbs),
    fat: round1(item.fat),
  }
}

function computeTotals(items: FoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: round1(acc.calories + item.calories),
      protein: round1(acc.protein + item.protein),
      carbs: round1(acc.carbs + item.carbs),
      fat: round1(acc.fat + item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bodyParse = analyzeBodySchema.safeParse(await request.json())
    if (!bodyParse.success) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const requestBody = bodyParse.data
    const image = 'image' in requestBody ? requestBody.image : null

    let imageParts: ReturnType<typeof extractImageParts> = null
    if (image) {
      imageParts = extractImageParts(image)
      if (!imageParts) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
      }
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server' },
        { status: 500 },
      )
    }

    const configuredModel = process.env.GEMINI_MODEL?.trim()
    const modelCandidates = [
      configuredModel,
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter((model, index, arr): model is string => Boolean(model) && arr.indexOf(model) === index)

    const prompt = image
      ? [
          'You are a nutrition analysis assistant.',
          'Analyze this meal image and estimate nutrition for each visible food item.',
          'Return ONLY valid JSON with this exact shape and numeric values:',
          '{"items":[{"name":"string","quantity":"string","weight_grams":0,"calories":0,"protein":0,"carbs":0,"fat":0}]}',
          'Rules:',
          '- Include all clearly visible foods and drinks.',
          '- Use realistic serving sizes and nutrition estimates.',
          '- If unsure, provide best estimate rather than empty response.',
          '- Do not include markdown or explanation.',
        ].join('\n')
      : [
          'You are a nutrition analysis assistant.',
          'Estimate nutrition for exactly one food item from text input.',
          `Food name: ${requestBody.foodName}`,
          `Quantity: ${requestBody.quantity}`,
          'Return ONLY valid JSON with this exact shape and numeric values:',
          '{"items":[{"name":"string","quantity":"string","weight_grams":0,"calories":0,"protein":0,"carbs":0,"fat":0}]}',
          'Rules:',
          '- Return exactly one item in the items array.',
          '- Use realistic nutrition estimates for the given quantity.',
          '- Keep quantity aligned with the user text.',
          '- Do not include markdown or explanation.',
        ].join('\n')

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    let rawText = ''
    let lastError: unknown = null

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []
        if (imageParts) {
          parts.push({
            inlineData: {
              data: imageParts.base64Data,
              mimeType: imageParts.mimeType,
            },
          })
        }
        parts.push({ text: prompt })

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        })

        rawText = result.response.text()
        if (rawText.trim()) {
          break
        }
      } catch (error) {
        lastError = error
      }
    }

    if (!rawText.trim()) {
      const message = lastError instanceof Error ? lastError.message : 'Gemini request failed'
      const normalizedMessage = message.toLowerCase()

      if (normalizedMessage.includes('429') || normalizedMessage.includes('quota') || normalizedMessage.includes('rate')) {
        return NextResponse.json(
          {
            error:
              'Gemini rate limit or quota exceeded. Please wait a minute and try again.',
          },
          { status: 429 },
        )
      }

      if (normalizedMessage.includes('401') || normalizedMessage.includes('403') || normalizedMessage.includes('api key')) {
        return NextResponse.json(
          { error: 'Gemini API key is invalid or not authorized for this model.' },
          { status: 502 },
        )
      }

      console.error('Gemini SDK error:', lastError)
      return NextResponse.json(
        { error: 'Gemini failed to analyze the image' },
        { status: 502 },
      )
    }

    const jsonString = extractJsonObject(rawText)
    if (!jsonString) {
      console.error('Gemini returned non-JSON:', rawText)
      return NextResponse.json(
        { error: 'Could not parse nutrition result from Gemini' },
        { status: 502 },
      )
    }

    const parsed = geminiResponseSchema.safeParse(JSON.parse(jsonString))
    if (!parsed.success) {
      console.error('Gemini schema mismatch:', parsed.error.flatten())
      return NextResponse.json(
        { error: 'Gemini response format was invalid' },
        { status: 502 },
      )
    }

    const normalizedItems = parsed.data.items
      .map(normalizeItem)
      .filter((item) => item.name.length > 0)

    const total = computeTotals(normalizedItems)

    return NextResponse.json({
      items: normalizedItems,
      total,
    })
  } catch (error) {
    console.error('Error analyzing meal:', error)
    return NextResponse.json(
      { error: 'Failed to analyze meal. Please try again.' },
      { status: 500 },
    )
  }
}
