import { useState, useEffect, useCallback } from 'react';
import { BookClubApiService, BookClub } from '../services/api';

export function useBookClubs() {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await BookClubApiService.getClubs();
    if (res.error) setError(res.error);
    else setClubs(res.data?.clubs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  const createClub = useCallback(
    async (data: { name: string; description?: string; coverImage?: string; currentBookId?: string; isPrivate?: boolean }) => {
      const res = await BookClubApiService.createClub(data);
      if (res.error) throw new Error(res.error);
      setClubs((prev) => [res.data!.club, ...prev]);
      return res.data!.club;
    },
    []
  );

  const joinClub = useCallback(async (clubId: string) => {
    const res = await BookClubApiService.joinClub(clubId);
    if (res.error) throw new Error(res.error);
    // Refetch so viewerRole / memberCount reflect the join across the list.
    await fetchClubs();
  }, [fetchClubs]);

  const leaveClub = useCallback(async (clubId: string) => {
    const res = await BookClubApiService.leaveClub(clubId);
    if (res.error) throw new Error(res.error);
    await fetchClubs();
  }, [fetchClubs]);

  return { clubs, loading, error, refetch: fetchClubs, createClub, joinClub, leaveClub };
}
