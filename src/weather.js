// Barcelona's weather right now, from Open-Meteo (free, no key).
// Add ?weather=rain (clear, clouds, overcast, fog, drizzle, rain, pour,
// storm, snow) to the URL to preview any of them.

const PLACE = { name: 'Barcelona', lat: 41.39, lon: 2.17 }
const URL_ = `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}&current=temperature_2m,weather_code&timezone=auto`
const CACHE_KEY = 'weather'
const CACHE_MS = 15 * 60 * 1000

// What the sky draws for each kind of weather.
export const KINDS = {
  clear:    { label: 'clear skies',  clouds: 0, rain: 0,   snow: 0, fog: 0, storm: false },
  clouds:   { label: 'a few clouds', clouds: 3, rain: 0,   snow: 0, fog: 0, storm: false },
  overcast: { label: 'overcast',     clouds: 6, rain: 0,   snow: 0, fog: 0, storm: false, hideSun: true },
  fog:      { label: 'foggy',        clouds: 1, rain: 0,   snow: 0, fog: 1, storm: false, hideSun: true },
  drizzle:  { label: 'drizzling',    clouds: 4, rain: 0.3, snow: 0, fog: 0, storm: false },
  rain:     { label: 'raining',      clouds: 5, rain: 0.7, snow: 0, fog: 0, storm: false, hideSun: true },
  pour:     { label: 'pouring',      clouds: 6, rain: 1.3, snow: 0, fog: 0, storm: false, hideSun: true },
  storm:    { label: 'stormy',       clouds: 6, rain: 1.2, snow: 0, fog: 0, storm: true,  hideSun: true },
  snow:     { label: 'snowing',      clouds: 5, rain: 0,   snow: 1, fog: 0, storm: false, hideSun: true },
}

// WMO weather codes, as Open-Meteo reports them
function kindFor(code) {
  if (code <= 1) return 'clear'
  if (code === 2) return 'clouds'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code === 65 || code === 67 || code === 82) return 'pour'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'clouds'
}

export async function getWeather() {
  const forced = new URLSearchParams(location.search).get('weather')
  if (forced && KINDS[forced]) return { place: PLACE.name, kind: forced, temp: null, preview: true }

  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data
  } catch { /* no storage: just fetch */ }

  try {
    const res = await fetch(URL_)
    if (!res.ok) throw new Error(res.statusText)
    const { current } = await res.json()
    const data = { place: PLACE.name, kind: kindFor(current.weather_code), temp: Math.round(current.temperature_2m) }
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })) } catch { /* fine */ }
    return data
  } catch {
    return null   // no weather: the sky just stays clear and the caption hides
  }
}
