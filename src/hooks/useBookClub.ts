import { useState, useEffect, useCallback } from 'react';
import {
  BookClubApiService,
  BookClubDetail,
  Discussion,
  DiscussionDetail,
} from '../services/api';

/**
 * Detail hook for a single book club: the club (incl. members) plus its
 * discussion list, with member actions (join/leave/create discussion).
 * Mirrors the list-only `useBookClubs` conventions.
 */
export function useBookClub(clubId: string) {
  const [club, setClub] = useState<BookClubDetail | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [clubRes, discRes] = await Promise.all([
      BookClubApiService.getClub(clubId),
      BookClubApiService.getDiscussions(clubId),
    ]);
    if (clubRes.error) setError(clubRes.error);
    else setClub(clubRes.data?.club ?? null);
    if (discRes.error) setError((prev) => prev ?? discRes.error!);
    else setDiscussions(discRes.data?.discussions ?? []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const join = useCallback(async () => {
    const res = await BookClubApiService.joinClub(clubId);
    if (res.error) throw new Error(res.error);
    // Refetch so isMember / viewerRole / memberCount / members reflect the join.
    await fetchAll();
  }, [clubId, fetchAll]);

  const leave = useCallback(async () => {
    const res = await BookClubApiService.leaveClub(clubId);
    if (res.error) throw new Error(res.error);
    await fetchAll();
  }, [clubId, fetchAll]);

  const createDiscussion = useCallback(
    async (data: { title: string; body: string }) => {
      const res = await BookClubApiService.createDiscussion(clubId, data);
      if (res.error) throw new Error(res.error);
      setDiscussions((prev) => [res.data!.discussion, ...prev]);
      return res.data!.discussion;
    },
    [clubId]
  );

  return { club, discussions, loading, error, refetch: fetchAll, join, leave, createDiscussion };
}

/**
 * Detail hook for a single discussion thread: the discussion (incl. comments)
 * plus an add-comment action. Lives in a component that only mounts once a
 * discussion is selected.
 */
export function useDiscussion(clubId: string, discussionId: string) {
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscussion = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await BookClubApiService.getDiscussion(clubId, discussionId);
    if (res.error) setError(res.error);
    else setDiscussion(res.data?.discussion ?? null);
    setLoading(false);
  }, [clubId, discussionId]);

  useEffect(() => { fetchDiscussion(); }, [fetchDiscussion]);

  const addComment = useCallback(
    async (body: string) => {
      const res = await BookClubApiService.addComment(clubId, discussionId, body);
      if (res.error) throw new Error(res.error);
      // Server returns the full comment (with author) — append it directly.
      setDiscussion((prev) =>
        prev
          ? { ...prev, comments: [...prev.comments, res.data!.comment], commentCount: prev.commentCount + 1 }
          : prev
      );
      return res.data!.comment;
    },
    [clubId, discussionId]
  );

  return { discussion, loading, error, refetch: fetchDiscussion, addComment };
}
