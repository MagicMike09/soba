import { UserContext } from '@/types'

export const getUserContext = async (): Promise<UserContext> => {
  const timestamp = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  let location: UserContext['location'] = undefined

  try {
    if (navigator.geolocation) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        })
      })

      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }

      // Try to get city/country from reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=en`
        )
        const data = await response.json()
        location.city = data.city || data.locality
        location.country = data.countryName
      } catch (error) {
        console.warn('Could not fetch location details:', error)
      }
    }
  } catch (error) {
    console.warn('Could not get user location:', error)
  }

  return {
    location,
    timestamp,
    timezone
  }
}

export const formatContextForAI = (context: UserContext): string => {
  const parts = [
    `Current time: ${context.timestamp.toLocaleString()}`,
    `Timezone: ${context.timezone}`
  ]

  if (context.location) {
    parts.push(`Location: ${context.location.latitude}, ${context.location.longitude}`)
    if (context.location.city) {
      parts.push(`City: ${context.location.city}`)
    }
    if (context.location.country) {
      parts.push(`Country: ${context.location.country}`)
    }
  }

  return parts.join('\n')
}