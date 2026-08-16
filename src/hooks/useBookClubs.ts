import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookClubApiService } from '../services/api';

export function useBookClubs() {
  const queryClient = useQueryClient();

  const { data: clubs = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['bookClubs'],
    queryFn: async () => {
      const res = await BookClubApiService.getClubs();
      if (res.error) throw new Error(res.error);
      return res.data?.clubs ?? [];
    },
  });

  const error = queryError ? queryError.message : null;

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; coverImage?: string; currentBookId?: string; isPrivate?: boolean }) => {
      const res = await BookClubApiService.createClub(data);
      if (res.error) throw new Error(res.error);
      return res.data!.club;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookClubs'] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (clubId: string) => {
      const res = await BookClubApiService.joinClub(clubId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookClubs'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (clubId: string) => {
      const res = await BookClubApiService.leaveClub(clubId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookClubs'] });
    },
  });

  const createClub = useCallback(
    async (data: { name: string; description?: string; coverImage?: string; currentBookId?: string; isPrivate?: boolean }) => 
      createMutation.mutateAsync(data),
    [createMutation]
  );

  const joinClub = useCallback(
    async (clubId: string) => joinMutation.mutateAsync(clubId),
    [joinMutation]
  );

  const leaveClub = useCallback(
    async (clubId: string) => leaveMutation.mutateAsync(clubId),
    [leaveMutation]
  );

  return { clubs, loading, error, refetch, createClub, joinClub, leaveClub };
}
