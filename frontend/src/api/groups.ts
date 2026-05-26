import type { ApiResponse, GroupDto, GroupWatchlistItemDto, LeaderboardEntryDto, GroupSuggestionDto } from '@/types'
import api from './axios'

export async function getMyGroups(): Promise<GroupDto[]> {
  const res = await api.get<ApiResponse<GroupDto[]>>('/groups')
  return res.data.data ?? []
}

export async function createGroup(name: string): Promise<GroupDto> {
  const res = await api.post<ApiResponse<GroupDto>>('/groups', { name })
  if (!res.data.data) throw new Error('Failed to create group')
  return res.data.data
}

export async function joinGroup(inviteCode: string): Promise<GroupDto> {
  const res = await api.post<ApiResponse<GroupDto>>('/groups/join', { inviteCode })
  if (!res.data.data) throw new Error('Failed to join group')
  return res.data.data
}

export async function getGroup(groupId: number): Promise<GroupDto> {
  const res = await api.get<ApiResponse<GroupDto>>(`/groups/${groupId}`)
  if (!res.data.data) throw new Error('Group not found')
  return res.data.data
}

export async function leaveGroup(groupId: number): Promise<void> {
  await api.delete(`/groups/${groupId}/leave`)
}

export async function getGroupWatchlist(groupId: number): Promise<GroupWatchlistItemDto[]> {
  const res = await api.get<ApiResponse<GroupWatchlistItemDto[]>>(`/groups/${groupId}/watchlist`)
  return res.data.data ?? []
}

export async function addToGroupWatchlist(
  groupId: number, tmdbId: number, mediaType: string
): Promise<GroupWatchlistItemDto> {
  const res = await api.post<ApiResponse<GroupWatchlistItemDto>>(
    `/groups/${groupId}/watchlist`, { tmdbId, mediaType })
  if (!res.data.data) throw new Error('Failed to add to group watchlist')
  return res.data.data
}

export async function toggleGroupWatched(
  groupId: number, itemId: number
): Promise<GroupWatchlistItemDto> {
  const res = await api.patch<ApiResponse<GroupWatchlistItemDto>>(
    `/groups/${groupId}/watchlist/${itemId}/watched`)
  if (!res.data.data) throw new Error('Failed to toggle watched')
  return res.data.data
}

export async function getLeaderboard(groupId: number): Promise<LeaderboardEntryDto[]> {
  const res = await api.get<ApiResponse<LeaderboardEntryDto[]>>(`/groups/${groupId}/leaderboard`)
  return res.data.data ?? []
}

export async function getSuggestions(groupId: number): Promise<GroupSuggestionDto[]> {
  const res = await api.get<ApiResponse<GroupSuggestionDto[]>>(`/groups/${groupId}/suggestions`)
  return res.data.data ?? []
}

export async function suggestMovie(
  groupId: number, tmdbId: number, mediaType: string
): Promise<GroupSuggestionDto> {
  const res = await api.post<ApiResponse<GroupSuggestionDto>>(
    `/groups/${groupId}/suggestions`, { tmdbId, mediaType })
  if (!res.data.data) throw new Error('Failed to suggest movie')
  return res.data.data
}

export async function voteOnSuggestion(
  groupId: number, suggestionId: number, vote: 1 | -1
): Promise<GroupSuggestionDto> {
  const res = await api.post<ApiResponse<GroupSuggestionDto>>(
    `/groups/${groupId}/suggestions/${suggestionId}/vote`, { vote })
  if (!res.data.data) throw new Error('Failed to vote')
  return res.data.data
}
