// Returns 3-5 notable place candidates with thumbnails for a commune
// Used by the place picker before climate image generation

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const mapsKey = config.googleMapsApiKey

  if (!mapsKey) {
    return { places: [] }
  }

  const query = getQuery(event)
  const communeName = query.communeName as string

  if (!communeName) {
    throw createError({ statusCode: 400, message: 'communeName requis' })
  }

  try {
    // Geocode commune
    const geocode = await $fetch<any>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address: `${communeName}, France`, key: mapsKey } },
    )

    const geoLocation = geocode.results?.[0]?.geometry?.location
    if (!geoLocation) {
      return { places: [] }
    }

    const location = `${geoLocation.lat},${geoLocation.lng}`

    // Parallel: parks (3km) + tourist attractions (5km)
    const [parksRes, attractionsRes] = await Promise.all([
      $fetch<any>(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params: { location, radius: 3000, type: 'park', key: mapsKey } },
      ),
      $fetch<any>(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params: { location, radius: 5000, type: 'tourist_attraction', key: mapsKey } },
      ),
    ])

    // Merge and dedupe by place_id
    const seen = new Set<string>()
    const allPlaces: any[] = []
    for (const p of [...(parksRes.results || []), ...(attractionsRes.results || [])]) {
      if (!seen.has(p.place_id) && p.photos?.length > 0) {
        seen.add(p.place_id)
        allPlaces.push(p)
      }
    }

    // Sort by popularity, take top 5
    allPlaces.sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0))
    const top = allPlaces.slice(0, 5)

    // Fetch thumbnails server-side (keeps Maps key private)
    const places = await Promise.all(
      top.map(async (p) => {
        const photoRef = p.photos[0].photo_reference
        let thumbnailUrl = ''

        try {
          const photoResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${photoRef}&maxwidth=200&key=${mapsKey}`,
            { redirect: 'follow' },
          )
          if (photoResponse.ok) {
            const buffer = new Uint8Array(await photoResponse.arrayBuffer())
            let binary = ''
            for (let i = 0; i < buffer.length; i++) {
              binary += String.fromCharCode(buffer[i])
            }
            thumbnailUrl = `data:image/jpeg;base64,${btoa(binary)}`
          }
        } catch {
          // Skip thumbnail on error
        }

        return {
          placeId: p.place_id,
          name: p.name,
          vicinity: p.vicinity || '',
          photoReference: photoRef,
          thumbnailUrl,
          rating: p.rating || 0,
          types: p.types || [],
        }
      }),
    )

    // Filter out places where thumbnail fetch failed
    return { places: places.filter((p) => p.thumbnailUrl) }
  } catch (e: any) {
    console.warn('Places search failed:', e.message)
    return { places: [] }
  }
})
