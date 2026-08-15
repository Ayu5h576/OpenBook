import { useState, useEffect, useCallback } from 'react';
import { SocialApiService, UserSummary } from '../services/api';

interface ProfileStats {
  followers: number;
  following: number;
}

/**
 * Detail hook for a user profile. There is no "get user by id" endpoint, so the
 * profile identity (username/avatar/bio) is seeded by the caller and this hook
 * fills in the social graph: follower/following counts + lists.
 *
 * `isFollowing` is derived from whether the viewer appears in the target's
 * followers list — no dedicated flag exists on the backend. `viewerId` also
 * lets the caller hide follow controls on the viewer's own profile.
 */
export function useProfile(userId: string, viewerId?: string) {
  const [stats, setStats] = useState<ProfileStats>({ followers: 0, following: 0 });
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSelf = !!viewerId && viewerId === userId;

  // `silent` skips the loading flag so a post-follow reconcile doesn't flash the skeleton.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const [statsRes, followersRes, followingRes] = await Promise.all([
        SocialApiService.getStats(userId),
        SocialApiService.getFollowers(userId),
        SocialApiService.getFollowing(userId),
      ]);
      if (statsRes.error) setError(statsRes.error);
      else setStats(statsRes.data?.stats ?? { followers: 0, following: 0 });

      const fw = followersRes.data?.users ?? [];
      setFollowers(fw);
      setFollowing(followingRes.data?.users ?? []);
      if (viewerId && !isSelf) setIsFollowing(fw.some((u) => u.id === viewerId));

      if (!silent) setLoading(false);
    },
    [userId, viewerId, isSelf]
  );

  useEffect(() => { load(); }, [load]);

  const toggleFollow = useCallback(async () => {
    if (!viewerId || isSelf || busy) return;
    const wasFollowing = isFollowing;
    setBusy(true);
    setError(null);
    // Optimistic: flip the button and nudge the count for instant feedback.
    setIsFollowing(!wasFollowing);
    setStats((s) => ({ ...s, followers: s.followers + (wasFollowing ? -1 : 1) }));
    try {
      const res = wasFollowing
        ? await SocialApiService.unfollow(userId)
        : await SocialApiService.follow(userId);
      if (res.error) throw new Error(res.error);
      // Reconcile with server truth (updates the followers strip + exact counts).
      await load(true);
    } catch (e: any) {
      // Roll back the optimistic changes.
      setIsFollowing(wasFollowing);
      setStats((s) => ({ ...s, followers: s.followers + (wasFollowing ? 1 : -1) }));
      setError(e.message || 'Could not update follow.');
    } finally {
      setBusy(false);
    }
  }, [viewerId, isSelf, busy, isFollowing, userId, load]);

  return { stats, followers, following, isFollowing, isSelf, loading, error, busy, toggleFollow, refetch: load };
}
