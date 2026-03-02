// Climate simulation image generation endpoint
// Pipeline: Street View photo → Gemini multimodal transformation → fallback text-only

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const aiKey = config.googleAiApiKey
  const mapsKey = config.googleMapsApiKey

  if (!aiKey) {
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
  const riskContext = risks?.length
    ? `The area is particularly affected by: ${risks.join(', ')}.`
    : ''

  // --- Step 1: Try to fetch a Street View photo of the town center ---
  let streetViewBase64: string | null = null
  let streetViewAddress = ''

  if (mapsKey) {
    try {
      // Geocode the commune name to get precise center coordinates
      const geocode = await $fetch<any>(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: { address: `${communeName}, France`, key: mapsKey },
        },
      )

      const geoLocation = geocode.results?.[0]?.geometry?.location
      if (geoLocation) {
        const svLocation = `${geoLocation.lat},${geoLocation.lng}`

        // Check Street View coverage at those coordinates (metadata is free)
        const metadata = await $fetch<any>(
          'https://maps.googleapis.com/maps/api/streetview/metadata',
          {
            params: { location: svLocation, key: mapsKey },
          },
        )

        if (metadata.status === 'OK') {
          // Reverse geocode the actual SV location to get the street name
          const svLat = metadata.location?.lat || geoLocation.lat
          const svLng = metadata.location?.lng || geoLocation.lng
          try {
            const reverseGeo = await $fetch<any>(
              'https://maps.googleapis.com/maps/api/geocode/json',
              {
                params: { latlng: `${svLat},${svLng}`, key: mapsKey, language: 'fr' },
              },
            )
            const components = reverseGeo.results?.[0]?.address_components || []
            const route = components.find((c: any) => c.types?.includes('route'))?.long_name
            const locality = components.find((c: any) => c.types?.includes('locality'))?.long_name
            streetViewAddress = [route, locality].filter(Boolean).join(', ')
          } catch {
            streetViewAddress = communeName
          }

          const imageResponse = await fetch(
            `https://maps.googleapis.com/maps/api/streetview?location=${svLocation}&size=640x640&fov=100&key=${mapsKey}`,
          )

          if (imageResponse.ok) {
            const buffer = new Uint8Array(await imageResponse.arrayBuffer())
            let binary = ''
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i])
            }
            streetViewBase64 = btoa(binary)
          }
        }
      }
    } catch (e: any) {
      console.warn('Street View fetch failed, falling back to text-only:', e.message)
    }
  }

  // --- Step 2: Generate image with Gemini ---
  try {
    if (streetViewBase64) {
      // Multimodal: transform real photo
      const result = await generateWithStreetView(aiKey, streetViewBase64, communeName, regionName, warming, riskContext)
      return { ...result, address: streetViewAddress, originalImage: `data:image/jpeg;base64,${streetViewBase64}` }
    }
    // Text-only: generate from scratch
    return await generateTextOnly(aiKey, communeName, regionName, warming, riskContext, risks)
  } catch (e: any) {
    console.error('Gemini generation error:', e?.data || e.message)

    // If multimodal failed, try text-only as intermediate fallback
    if (streetViewBase64) {
      try {
        console.warn('Multimodal failed, retrying text-only')
        return await generateTextOnly(aiKey, communeName, regionName, warming, riskContext, risks)
      } catch {
        // Continue to Imagen fallback
      }
    }

    // Last resort: Imagen 4
    try {
      return await generateWithImagen(aiKey, communeName, regionName, warming, riskContext, risks)
    } catch {
      // All methods failed
    }

    const safeMessage = (e.message || '').replace(/key=[^&"\s]+/gi, 'key=***')
    throw createError({
      statusCode: 500,
      message: `Génération d'image échouée: ${safeMessage}`,
    })
  }
})

// --- Multimodal: Street View + Gemini transformation ---
async function generateWithStreetView(
  apiKey: string,
  imageBase64: string,
  communeName: string,
  regionName: string,
  warming: string,
  riskContext: string,
) {
  const prompt = `Transform this real photograph to show what this exact location would look like in 2050 under a climate warming scenario of ${warming} above pre-industrial levels.

Keep the same viewpoint, buildings, and street layout — but apply realistic climate impacts: ${riskContext} Show effects like: drought-stressed vegetation, heat haze, yellowed/dried grass, cracked pavement, sun-bleached facades, adapted infrastructure (sun shading, water barriers), dried riverbeds or flooding depending on risks. Style: realistic, documentary, same camera angle.

ALSO write 3-4 sentences IN FRENCH describing the concrete situation for the residents of ${communeName} (${regionName || 'France'}) under this ${warming} warming scenario by 2050. Be factual and specific to this commune.`

  const response = await $fetch<any>(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      params: { key: apiKey },
      body: {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    },
  )

  const parts = response.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  const fullText = parts
    .filter((p: any) => p.text)
    .map((p: any) => (p.text as string).trim())
    .join(' ')
    .trim()

  if (!imagePart) {
    throw new Error('No image generated from multimodal input')
  }

  return {
    image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    description: fullText || `${communeName} en 2050 (scénario ${warming})`,
    source: 'streetview',
  }
}

// --- Text-only: Gemini generates from scratch ---
async function generateTextOnly(
  apiKey: string,
  communeName: string,
  regionName: string,
  warming: string,
  riskContext: string,
  risks?: string[],
) {
  const prompt = `Generate an image AND a text description.

IMAGE: A realistic photographic view of the French commune of ${communeName} (${regionName || 'France'}) in the year 2050 under a climate warming scenario of ${warming} above pre-industrial levels. Show realistic climate impacts: ${riskContext} The scene should show recognizable French urban/rural architecture adapted to extreme heat — drought-resistant vegetation, sun shading structures, dried riverbed or flooded streets depending on risks, yellowed grass, intense sunlight with haze. Style: documentary photography, golden hour, slightly dystopian but realistic. No text overlays.

TEXT: Write 3-4 sentences IN FRENCH describing the concrete situation for the residents of ${communeName} under this ${warming} warming scenario by 2050. Cover: (1) the main climate risks specific to this commune (${risks?.join(', ') || 'risques climatiques généraux'}), (2) what daily life concretely looks like (summer temperatures, water availability, outdoor activities, agriculture if rural), (3) one specific adaptation challenge or change the municipality would face. Be factual, specific to this commune and its geography, and grounded — not generic or alarmist.`

  const response = await $fetch<any>(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      params: { key: apiKey },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    },
  )

  const parts = response.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  const fullText = parts
    .filter((p: any) => p.text)
    .map((p: any) => (p.text as string).trim())
    .join(' ')
    .trim()

  if (!imagePart) {
    throw new Error('No image generated')
  }

  return {
    image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    description: fullText || `${communeName} en 2050 (scénario ${warming})`,
    source: 'generated',
  }
}

// --- Imagen 4 fallback (text-only, no description) ---
async function generateWithImagen(
  apiKey: string,
  communeName: string,
  regionName: string,
  warming: string,
  riskContext: string,
  risks?: string[],
) {
  const prompt = `A realistic photographic view of the French commune of ${communeName} (${regionName || 'France'}) in 2050 under ${warming} warming. ${riskContext} French architecture, climate impacts, documentary photography style.`

  const response = await $fetch<any>(
    'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
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

  const predictions = response.predictions || []
  if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
    return {
      image: `data:image/png;base64,${predictions[0].bytesBase64Encoded}`,
      description: `${communeName} en 2050 (scénario ${warming})`,
      source: 'generated',
    }
  }

  throw new Error('Imagen generation failed')
}
