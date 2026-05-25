import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteAvailability, getAdminPlatforms, getAdminStats, getAdminUsers, getMovieAvailability, getUserBadges, getUserMe, getUserPreferences, getUserStats, saveUserPreferences, seedAvailability, toggleBlacklist } from '@/api/user'
import { useAuth } from '@/context/AuthContext'
import type { UserPreferences } from '@/types'

export function useCurrentUser() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: getUserMe,
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
    staleTime: 60 * 1000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    staleTime: 60 * 1000,
  })
}

export function useAdminPlatforms() {
  return useQuery({
    queryKey: ['admin', 'platforms'],
    queryFn: getAdminPlatforms,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSeedAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: seedAvailability,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'availability', variables.tmdbId] })
    },
  })
}

export function useMovieAvailability(tmdbId: number | null) {
  return useQuery({
    queryKey: ['admin', 'availability', tmdbId],
    queryFn: () => getMovieAvailability(tmdbId!),
    enabled: tmdbId !== null,
  })
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'availability'] })
    },
  })
}

export function useToggleBlacklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => toggleBlacklist(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useUserBadges() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user', 'badges'],
    queryFn: getUserBadges,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: getUserStats,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: getUserPreferences,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSavePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: UserPreferences) => saveUserPreferences(prefs),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'preferences'], data)
    },
  })
}
