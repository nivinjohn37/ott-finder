import type { AdminStats, AdminUserDto, ApiResponse, UserMe, UserPreferences, UserStats } from '@/types'
import api from './axios'

export async function getUserMe(): Promise<UserMe> {
  const res = await api.get<ApiResponse<UserMe>>('/user/me')
  if (!res.data.data) throw new Error('User not found')
  return res.data.data
}

export async function getUserStats(): Promise<UserStats> {
  const res = await api.get<ApiResponse<UserStats>>('/user/stats')
  return res.data.data ?? { favouriteGenre: null, totalWatchlist: 0, totalWatched: 0 }
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await api.get<ApiResponse<UserPreferences>>('/user/preferences')
  return res.data.data ?? { genres: [], platforms: [] }
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const res = await api.put<ApiResponse<UserPreferences>>('/user/preferences', prefs)
  return res.data.data ?? prefs
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get<ApiResponse<AdminStats>>('/admin/stats')
  if (!res.data.data) throw new Error('Failed to fetch admin stats')
  return res.data.data
}

export async function getAdminUsers(): Promise<AdminUserDto[]> {
  const res = await api.get<ApiResponse<AdminUserDto[]>>('/admin/users')
  return res.data.data ?? []
}

export async function getAdminPlatforms(): Promise<{ name: string; displayName: string }[]> {
  const res = await api.get<ApiResponse<{ platformName: string; displayName: string }[]>>('/admin/platforms')
  return (res.data.data ?? []).map(p => ({ name: p.platformName, displayName: p.displayName }))
}

export async function seedAvailability(body: {
  tmdbId: number
  mediaType: string
  platformName: string
  deepLink?: string
  availableUntil?: string
}): Promise<string> {
  const res = await api.post<ApiResponse<string>>('/admin/availability', body)
  return res.data.data ?? 'Done'
}
