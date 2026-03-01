// Nano Banana Pro (Gemini 3 Pro) image generation endpoint
// Generates climate simulation images for communes at +2.7°C

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.googleAiApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'GOOGLE_AI_API_KEY non configurée.',
    })
  }

  const body = await readBody(event)
  const { communeName, regionName, risks, scenario } = body

  if (!communeName) {
    throw createError({ statusCode: 400, message: 'communeName requis' })
  }

  const warming = scenario === 'rcp26' ? '+1.2°C' : scenario === 'rcp85' ? '+4.8°C' : '+2.7°C'

  // Build a detailed prompt for climate-impacted cityscape
  const riskContext = risks?.length
    ? `The area is particularly affected by: ${risks.join(', ')}.`
    : ''

  const prompt = `A realistic photographic view of the French commune of ${communeName} (${regionName || 'France'}) in the year 2050 under a climate warming scenario of ${warming} above pre-industrial levels. Show realistic climate impacts: ${riskContext} The scene should show recognizable French urban/rural architecture adapted to extreme heat — drought-resistant vegetation, sun shading structures, dried riverbed or flooded streets depending on risks, yellowed grass, intense sunlight with haze. Style: documentary photography, golden hour, slightly dystopian but realistic. No text overlays.`

  try {
    // Call Gemini generateContent with image generation enabled
    // Using gemini-2.0-flash-preview-image-generation for Nano Banana
    const response = await $fetch<any>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent`,
      {
        method: 'POST',
        params: { key: apiKey },
        body: {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        },
      },
    )

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
    const textPart = parts.find((p: any) => p.text)

    if (!imagePart) {
      throw new Error('No image generated')
    }

    return {
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      description: textPart?.text || `${communeName} en 2050 (scénario ${warming})`,
    }
  } catch (e: any) {
    console.error('Image generation error:', e?.data || e.message)

    // If Nano Banana Pro model not available, try Imagen
    try {
      const imagenResponse = await $fetch<any>(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
        {
          method: 'POST',
          params: { key: apiKey },
          body: {
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9',
            },
          },
        },
      )

      const predictions = imagenResponse.predictions || []
      if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
        return {
          image: `data:image/png;base64,${predictions[0].bytesBase64Encoded}`,
          description: `${communeName} en 2050 (scénario ${warming})`,
        }
      }
    } catch {
      // Both failed
    }

    throw createError({
      statusCode: 500,
      message: `Génération d'image échouée: ${e.message}`,
    })
  }
})
