// Returns 3-5 notable green/natural place candidates for a commune
// Used by the place picker before climate image generation
// Prioritizes parks, natural features and green spaces (better for visualizing climate impacts)

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

    // Parallel: parks (5km) + natural features (5km)
    const [parksRes, naturalRes] = await Promise.all([
      $fetch<any>(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params: { location, radius: 5000, type: 'park', key: mapsKey } },
      ),
      $fetch<any>(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params: { location, radius: 5000, type: 'natural_feature', key: mapsKey } },
      ),
    ])

    // Merge and dedupe by place_id, require a photo reference for image generation
    const seen = new Set<string>()
    const allPlaces: any[] = []
    for (const p of [...(parksRes.results || []), ...(naturalRes.results || [])]) {
      if (!seen.has(p.place_id) && p.photos?.length > 0) {
        seen.add(p.place_id)
        allPlaces.push(p)
      }
    }

    // Score: parks and natural features get a bonus, then sort by popularity
    allPlaces.sort((a, b) => {
      const aScore = (b.user_ratings_total || 0) - (a.user_ratings_total || 0)
      const aIsNature = (a.types || []).some((t: string) => t === 'park' || t === 'natural_feature') ? 500 : 0
      const bIsNature = (b.types || []).some((t: string) => t === 'park' || t === 'natural_feature') ? 500 : 0
      return aScore + bIsNature - aIsNature
    })

    const top = allPlaces.slice(0, 5)

    const places = top.map((p) => ({
      placeId: p.place_id,
      name: p.name,
      vicinity: p.vicinity || '',
      photoReference: p.photos[0].photo_reference,
      rating: p.rating || 0,
      types: p.types || [],
    }))

    return { places }
  } catch (e: any) {
    console.warn('Places search failed:', e.message)
    return { places: [] }
  }
})
