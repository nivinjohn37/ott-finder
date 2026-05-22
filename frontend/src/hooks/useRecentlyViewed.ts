import { useState, useCallback, useEffect } from 'react'
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

  const [items, setItems] = useState<MovieSearchResult[]>(() =>
    uid ? readStorage(uid) : []
  )

  // Re-read from storage whenever the logged-in user changes
  useEffect(() => {
    setItems(uid ? readStorage(uid) : [])
  }, [uid])

  const addItem = useCallback((movie: MovieSearchResult) => {
    if (!uid) return
    setItems((prev) => {
      const deduped = prev.filter((m) => m.tmdbId !== movie.tmdbId)
      const next = [movie, ...deduped].slice(0, MAX)
      localStorage.setItem(storageKey(uid), JSON.stringify(next))
      return next
    })
  }, [uid])

  const clearAll = useCallback(() => {
    if (!uid) return
    localStorage.removeItem(storageKey(uid))
    setItems([])
  }, [uid])

  return { items, addItem, clearAll }
}
