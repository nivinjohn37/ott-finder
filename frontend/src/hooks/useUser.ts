import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserPreferences, getUserStats, saveUserPreferences } from '@/api/user'
import type { UserPreferences } from '@/types'

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
