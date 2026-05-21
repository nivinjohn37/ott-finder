import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminPlatforms, getAdminStats, getUserMe, getUserPreferences, getUserStats, saveUserPreferences, seedAvailability } from '@/api/user'
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
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
