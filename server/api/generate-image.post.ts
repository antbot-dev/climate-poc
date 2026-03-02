// Climate simulation image generation endpoint
// Pipeline: Google Places park photo → Gemini multimodal transformation → fallback text-only

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
  const { communeName, regionName, risks, scenario, photoReference: bodyPhotoRef, placeName: bodyPlaceName } = body

  if (!communeName) {
    throw createError({ statusCode: 400, message: 'communeName requis' })
  }

  const warming = scenario === 'rcp85' ? '+4.8°C' : '+2.7°C'
  const riskContext = risks?.length
    ? `The area is particularly affected by: ${risks.join(', ')}.`
    : ''

  // --- Step 1: Get a place photo (from picker selection or auto-search) ---
  let placePhotoBase64: string | null = null
  let placeName = ''

  if (bodyPhotoRef && bodyPlaceName && mapsKey) {
    // User picked a specific place — fetch its 800px photo directly
    placeName = bodyPlaceName
    try {
      const photoResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${bodyPhotoRef}&maxwidth=800&key=${mapsKey}`,
        { redirect: 'follow' },
      )
      if (photoResponse.ok) {
        const buffer = new Uint8Array(await photoResponse.arrayBuffer())
        let binary = ''
        for (let i = 0; i < buffer.length; i++) {
          binary += String.fromCharCode(buffer[i])
        }
        placePhotoBase64 = btoa(binary)
      }
    } catch (e: any) {
      console.warn('Photo reference fetch failed, falling back to auto-search:', e.message)
    }
  }

  // Fallback: auto-search for best park (existing logic)
  if (!placePhotoBase64 && mapsKey) {
    try {
      const geocode = await $fetch<any>(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: { address: `${communeName}, France`, key: mapsKey },
        },
      )

      const geoLocation = geocode.results?.[0]?.geometry?.location
      if (geoLocation) {
        const places = await $fetch<any>(
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
          {
            params: {
              location: `${geoLocation.lat},${geoLocation.lng}`,
              radius: 3000,
              type: 'park',
              key: mapsKey,
            },
          },
        )

        const bestPlace = (places.results || [])
          .filter((p: any) => p.photos?.length > 0)
          .sort((a: any, b: any) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0))
          [0]

        if (bestPlace?.photos?.[0]?.photo_reference) {
          placeName = bestPlace.name || ''

          const photoResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${bestPlace.photos[0].photo_reference}&maxwidth=800&key=${mapsKey}`,
            { redirect: 'follow' },
          )

          if (photoResponse.ok) {
            const buffer = new Uint8Array(await photoResponse.arrayBuffer())
            let binary = ''
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i])
            }
            placePhotoBase64 = btoa(binary)
          }
        }
      }
    } catch (e: any) {
      console.warn('Places photo fetch failed, falling back to text-only:', e.message)
    }
  }

  // --- Step 2: Generate image with Gemini ---
  try {
    if (placePhotoBase64) {
      // Multimodal: transform real photo
      const result = await generateFromPhoto(aiKey, placePhotoBase64, communeName, regionName, warming, riskContext, placeName)
      return { ...result, address: `${placeName}, ${communeName}`, originalImage: `data:image/jpeg;base64,${placePhotoBase64}` }
    }
    // Text-only: generate from scratch
    return await generateTextOnly(aiKey, communeName, regionName, warming, riskContext, risks)
  } catch (e: any) {
    console.error('Gemini generation error:', e?.data || e.message)

    // If multimodal failed, try text-only as intermediate fallback
    if (placePhotoBase64) {
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

// --- Multimodal: real photo + Gemini transformation ---
async function generateFromPhoto(
  apiKey: string,
  imageBase64: string,
  communeName: string,
  regionName: string,
  warming: string,
  riskContext: string,
  locationName: string,
) {
  const isModerate = warming === '+2.7°C'

  const moderateInstructions = `Apply SUBTLE but visible modifications to show a harsh late-summer drought:
- Vegetation: grass yellowed in patches (not uniformly dead), some green remains in shaded areas. Trees show drought stress — wilted, sparse foliage, some early leaf drop — but most still have leaves.
- Water bodies: slightly lower levels, some exposed banks or mudflats at the edges.
- Sky: still mostly blue but hazier, with a warm diffused light. Slightly washed-out, like a very hot August day. Do NOT turn the sky yellow or orange.
- Ground/paths: drier, some cracks in exposed earth, dusty appearance.
- CRITICAL: Maintain realistic, natural color balance. Do NOT apply a uniform yellow, orange, or amber color filter. The image must look like a real photograph taken during a severe summer heatwave, not a color-graded disaster movie.`

  const severeInstructions = `Apply CLEAR modifications to show severe climate stress, like a prolonged extreme drought:
- Vegetation: most grass brown and dry, trees with significant leaf loss — thin canopy, many bare branches, remaining leaves brown or wilted. Some patches of resistant green may survive.
- Water bodies: visibly reduced levels, wide exposed dry banks, cracked mud where water used to be.
- Sky: heat haze visible, warm pale tones, slightly milky/hazy atmosphere. Can have amber tones near the horizon but the sky should not be a solid orange wall.
- Ground/paths: cracked, parched, dusty earth tones.
- CRITICAL: Keep the image photorealistic. Think "severe drought documentary photography", not post-apocalyptic. Avoid applying a uniform color filter over the entire image. Natural color variation should remain.`

  const prompt = `Transform this photograph of ${locationName} in ${communeName} (${regionName || 'France'}) to realistically visualize climate change impacts in 2050 under ${warming} warming.

${isModerate ? moderateInstructions : severeInstructions}
${riskContext}

The changes should be clearly visible in a before/after comparison while remaining scientifically plausible and photorealistic. Keep the same framing and recognizable landmarks.

ALSO write IN FRENCH a detailed description (4-6 sentences). Start with "Voici à quoi pourrait ressembler ${locationName} en 2050 avec un réchauffement de ${warming} :". Describe each visible change (vegetation, water, ground, atmosphere). End with concrete impacts for ${communeName} residents.`

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
    source: 'places',
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
  const isModerate = warming === '+2.7°C'

  const visualStyle = isModerate
    ? `Show a harsh late-summer scene: grass yellowed in patches but some green remains, trees with drought-stressed sparse foliage, slightly hazy blue sky with warm diffused light, drier ground. The scene should look like a severe August heatwave — uncomfortable but realistic. Do NOT apply a uniform yellow/orange color filter.`
    : `Show a severe prolonged drought: most grass brown, trees with significant leaf loss and bare branches, heat haze in the atmosphere with warm pale tones, cracked dry ground, reduced water levels. Think documentary photography of extreme drought — clear impact but still photorealistic. Avoid uniform color grading.`

  const prompt = `Generate an image AND a text description.

IMAGE: A realistic photographic view of the French commune of ${communeName} (${regionName || 'France'}) in 2050 under ${warming} warming. ${visualStyle} ${riskContext} Show recognizable French architecture. Style: documentary photography, natural lighting, photorealistic. No text overlays.

TEXT: Write IN FRENCH a detailed description (4-6 sentences) of the generated image. Start by naming the commune ("Voici à quoi pourrait ressembler ${communeName} en 2050 avec un réchauffement de ${warming} :"). Then describe each visible change: vegetation state, water levels, ground condition, atmosphere. Mention the specific risks (${risks?.join(', ') || 'risques climatiques généraux'}) and their visible effects. End with concrete impacts for residents (temperatures, water restrictions, daily life). Be specific to ${communeName} — not generic.`

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
