import { UserContext } from '@/types'

// Configuration de cache
const LOCATION_CACHE_KEY = 'user-location-cache'
const CACHE_DURATION = 3600000 // 1 heure en millisecondes

interface CachedLocation {
  data: UserContext['location']
  timestamp: number
}

// Fonction pour récupérer la localisation en cache
const getCachedLocation = (): UserContext['location'] | null => {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY)
    if (cached) {
      const { data, timestamp }: CachedLocation = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('📍 Using cached location data')
        return data
      } else {
        console.log('📍 Location cache expired')
        localStorage.removeItem(LOCATION_CACHE_KEY)
      }
    }
  } catch (error) {
    console.warn('Error reading location cache:', error)
    localStorage.removeItem(LOCATION_CACHE_KEY)
  }
  return null
}

// Fonction pour sauvegarder la localisation en cache
const setCachedLocation = (location: UserContext['location']) => {
  try {
    const cacheData: CachedLocation = {
      data: location,
      timestamp: Date.now()
    }
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData))
    console.log('📍 Location cached successfully')
  } catch (error) {
    console.warn('Could not cache location:', error)
  }
}

export const getUserContext = async (): Promise<UserContext> => {
  const timestamp = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Vérifier le cache d'abord
  let location: UserContext['location'] = getCachedLocation() || undefined

  // Si pas de cache ou expiré, récupérer la nouvelle localisation
  if (!location) {
    try {
      if (navigator.geolocation && window.isSecureContext) {
        console.log('📍 Requesting fresh location data...')
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve, 
            reject, 
            {
              timeout: 15000, // Augmenté à 15 secondes
              enableHighAccuracy: false, // Moins précis mais plus rapide
              maximumAge: 300000 // Accepter une position de 5 minutes maximum
            }
          )
        })

        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }

        // Reverse geocoding avec gestion d'erreurs améliorée
        try {
          console.log('🌍 Fetching location details...')
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // Timeout 5 secondes

          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=fr`,
            { 
              signal: controller.signal,
              headers: {
                'Accept': 'application/json'
              }
            }
          )
          
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          
          if (data && typeof data === 'object') {
            location.city = data.city || data.locality || data.principalSubdivision
            location.country = data.countryName || data.countryCode
            console.log('✅ Location details fetched:', location.city, location.country)
          }
        } catch (error) {
          console.warn('Could not fetch location details:', error)
          // Continuer sans les détails de localisation
        }

        // Mettre en cache la nouvelle localisation
        setCachedLocation(location)
      } else {
        console.warn('Geolocation not available or not in secure context')
      }
    } catch (error) {
      console.warn('Could not get user location:', error)
      
      // Gérer les erreurs spécifiques
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.warn('User denied geolocation permission')
            break
          case error.POSITION_UNAVAILABLE:
            console.warn('Location information unavailable')
            break
          case error.TIMEOUT:
            console.warn('Location request timed out')
            break
        }
      }
    }
  }

  return {
    location,
    timestamp,
    timezone
  }
}

export const formatContextForAI = (context: UserContext): string => {
  const now = context.timestamp
  const parts = [
    `Date et heure: ${now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })} à ${now.toLocaleTimeString('fr-FR')}`,
    `Fuseau horaire: ${context.timezone}`
  ]

  // Ajouter l'heure de la journée pour un contexte conversationnel
  const hour = now.getHours()
  let timeOfDay = ''
  if (hour >= 5 && hour < 12) timeOfDay = 'matin'
  else if (hour >= 12 && hour < 18) timeOfDay = 'après-midi'
  else if (hour >= 18 && hour < 22) timeOfDay = 'soirée'
  else timeOfDay = 'nuit'
  
  parts.push(`Moment de la journée: ${timeOfDay}`)

  if (context.location) {
    if (context.location.city && context.location.country) {
      parts.push(`Localisation: ${context.location.city}, ${context.location.country}`)
    } else if (context.location.country) {
      parts.push(`Pays: ${context.location.country}`)
    } else {
      parts.push(`Coordonnées: ${context.location.latitude.toFixed(2)}, ${context.location.longitude.toFixed(2)}`)
    }
  } else {
    parts.push('Localisation: Non disponible')
  }

  return parts.join('\n')
}