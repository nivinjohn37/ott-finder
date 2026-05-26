import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addToGroupWatchlist, createGroup, getGroup, getGroupWatchlist,
  getLeaderboard, getMyGroups, getSuggestions, joinGroup, leaveGroup,
  suggestMovie, toggleGroupWatched, voteOnSuggestion,
} from '@/api/groups'
import { useAuth } from '@/context/AuthContext'

export function useMyGroups() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['groups'],
    queryFn: getMyGroups,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })
}

export function useGroup(groupId: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => getGroup(groupId),
    enabled: !!user && groupId > 0,
    staleTime: 60 * 1000,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useJoinGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => joinGroup(inviteCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useLeaveGroup(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useGroupWatchlist(groupId: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['groups', groupId, 'watchlist'],
    queryFn: () => getGroupWatchlist(groupId),
    enabled: !!user && groupId > 0,
    staleTime: 30 * 1000,
  })
}

export function useAddToGroupWatchlist(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: string }) =>
      addToGroupWatchlist(groupId, tmdbId, mediaType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'leaderboard'] })
    },
  })
}

export function useToggleGroupWatched(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: number) => toggleGroupWatched(groupId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'watchlist'] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'leaderboard'] })
    },
  })
}

export function useLeaderboard(groupId: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['groups', groupId, 'leaderboard'],
    queryFn: () => getLeaderboard(groupId),
    enabled: !!user && groupId > 0,
    staleTime: 30 * 1000,
  })
}

export function useGroupSuggestions(groupId: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['groups', groupId, 'suggestions'],
    queryFn: () => getSuggestions(groupId),
    enabled: !!user && groupId > 0,
    staleTime: 30 * 1000,
  })
}

export function useSuggestMovie(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: string }) =>
      suggestMovie(groupId, tmdbId, mediaType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId, 'suggestions'] }),
  })
}

export function useVoteOnSuggestion(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ suggestionId, vote }: { suggestionId: number; vote: 1 | -1 }) =>
      voteOnSuggestion(groupId, suggestionId, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId, 'suggestions'] }),
  })
}
