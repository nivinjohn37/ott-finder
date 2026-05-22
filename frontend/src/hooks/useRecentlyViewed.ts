import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { MovieSearchResult } from '@/types'

const MAX = 10

function storageKey(uid: string) {
  return `ott_recently_viewed_${uid}`
}

function readStorage(uid: string): MovieSearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(uid)) ?? '[]')
  } catch {
    return []
  }
}

export function useRecentlyViewed() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const uidRef = useRef(uid)

  const [items, setItems] = useState<MovieSearchResult[]>([])

  // Keep ref in sync so addItem always sees the latest uid without being recreated
  useEffect(() => {
    uidRef.current = uid
    setItems(uid ? readStorage(uid) : [])
  }, [uid])

  const addItem = useCallback((movie: MovieSearchResult) => {
    const currentUid = uidRef.current
    if (!currentUid) return
    setItems((prev) => {
      const deduped = prev.filter((m) => m.tmdbId !== movie.tmdbId)
      const next = [movie, ...deduped].slice(0, MAX)
      localStorage.setItem(storageKey(currentUid), JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    const currentUid = uidRef.current
    if (!currentUid) return
    localStorage.removeItem(storageKey(currentUid))
    setItems([])
  }, [])

  return { items, addItem, clearAll }
}
