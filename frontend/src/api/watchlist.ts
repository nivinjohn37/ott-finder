import type { ApiResponse, WatchlistItem } from '@/types'
import api from './axios'

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const res = await api.get<ApiResponse<WatchlistItem[]>>('/watchlist')
  return res.data.data ?? []
}

export async function addToWatchlist(movieId: number, mediaType: string): Promise<WatchlistItem> {
  const res = await api.post<ApiResponse<WatchlistItem>>('/watchlist', { movieId, mediaType })
  if (!res.data.data) throw new Error('Failed to add to watchlist')
  return res.data.data
}

export async function removeFromWatchlist(watchlistId: number): Promise<void> {
  await api.delete(`/watchlist/${watchlistId}`)
}

export async function getExpiringWatchlist(): Promise<WatchlistItem[]> {
  const res = await api.get<ApiResponse<WatchlistItem[]>>('/watchlist/expiring')
  return res.data.data ?? []
}

export async function toggleWatched(watchlistId: number): Promise<WatchlistItem> {
  const res = await api.patch<ApiResponse<WatchlistItem>>(`/watchlist/${watchlistId}/watched`)
  if (!res.data.data) throw new Error('Failed to toggle watched')
  return res.data.data
}
