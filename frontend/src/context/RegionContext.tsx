import { createContext, useContext, useState } from 'react'

export interface Region {
  code: string   // TMDB region param value ('IN', 'AU', etc.) or 'global'
  label: string
  flag: string
}

export const REGIONS: Region[] = [
  { code: 'IN', label: 'India',     flag: '🇮🇳' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'US', label: 'USA',       flag: '🇺🇸' },
  { code: 'GB', label: 'UK',        flag: '🇬🇧' },
  { code: 'CA', label: 'Canada',    flag: '🇨🇦' },
  { code: 'global', label: 'Global', flag: '🌍' },
]

const STORAGE_KEY = 'ott_region'

function detectDefault(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && REGIONS.find((r) => r.code === saved)) return saved
    const lang = navigator.language ?? ''
    if (lang.includes('AU')) return 'AU'
    if (lang.includes('GB')) return 'GB'
    if (lang.includes('CA')) return 'CA'
    if (lang.includes('US')) return 'US'
  } catch { /* ignore */ }
  return 'IN'
}

interface RegionCtx {
  region: Region
  setRegion: (r: Region) => void
}

const RegionContext = createContext<RegionCtx | null>(null)

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region>(() => {
    const code = detectDefault()
    return REGIONS.find((r) => r.code === code) ?? REGIONS[0]
  })

  function setRegion(r: Region) {
    setRegionState(r)
    try { localStorage.setItem(STORAGE_KEY, r.code) } catch { /* ignore */ }
  }

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error('useRegion must be used within RegionProvider')
  return ctx
}
