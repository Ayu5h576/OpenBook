import React, { useState } from 'react';
import {
  Users, MessageSquare, Sparkles, BookOpen, UserCheck, Plus, X, Loader2,
  Crown, Shield, Lock, Award, UserPlus, PenSquare, Star, Rss,
} from 'lucide-react';
import { useBookClubs } from '../hooks/useBookClubs';
import { useActivityFeed, FeedScope } from '../hooks/useActivityFeed';
import type { ActivityItem, ActivityType } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTIVITY_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  FINISHED_BOOK: BookOpen,
  STARTED_BOOK: BookOpen,
  ADDED_TO_LIBRARY: Plus,
  WROTE_REVIEW: PenSquare,
  FOLLOWED_USER: UserPlus,
  CREATED_CLUB: Users,
  JOINED_CLUB: UserCheck,
  POSTED_DISCUSSION: MessageSquare,
  UNLOCKED_ACHIEVEMENT: Award,
};

function activityText(a: ActivityItem): React.ReactNode {
  const who = <span className="font-semibold text-[#1D1D1D]">{a.actor.username}</span>;
  const book = a.book ? <span className="italic">{a.book.title}</span> : null;
  const meta = a.metadata || {};
  switch (a.type) {
    case 'FINISHED_BOOK':
      return <>{who} finished reading {book ?? <span className="italic">{meta.bookTitle}</span>}</>;
    case 'STARTED_BOOK':
      return <>{who} started reading {book ?? <span className="italic">{meta.bookTitle}</span>}</>;
    case 'ADDED_TO_LIBRARY':
      return <>{who} added {book ?? <span className="italic">{meta.bookTitle}</span>} to their library</>;
    case 'WROTE_REVIEW':
      return (
        <>
          {who} reviewed {book ?? <span className="italic">{meta.bookTitle}</span>}
          {typeof meta.rating === 'number' && (
            <span className="inline-flex items-center gap-0.5 ml-1 text-[#A0522D]">
              <Star className="w-3 h-3 fill-current" />{meta.rating}
            </span>
          )}
        </>
      );
    case 'FOLLOWED_USER':
      return <>{who} followed {meta.targetUsername ? <span className="font-semibold text-[#1D1D1D]">{meta.targetUsername}</span> : 'a new reader'}</>;
    case 'CREATED_CLUB':
      return <>{who} created the club {meta.clubName ? <span className="font-semibold text-[#1D1D1D]">{meta.clubName}</span> : ''}</>;
    case 'JOINED_CLUB':
      return <>{who} joined {meta.clubName ? <span className="font-semibold text-[#1D1D1D]">{meta.clubName}</span> : 'a book club'}</>;
    case 'POSTED_DISCUSSION':
      return <>{who} started a discussion{meta.discussionTitle ? <>: <span className="italic">{meta.discussionTitle}</span></> : ''}</>;
    case 'UNLOCKED_ACHIEVEMENT':
      return <>{who} unlocked {meta.achievementTitle ? <span className="font-semibold text-[#1D1D1D]">{meta.achievementTitle}</span> : 'an achievement'}</>;
    default:
      return <>{who} did something noteworthy</>;
  }
}

const ROLE_BADGE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  OWNER: { icon: Crown, label: 'Owner' },
  MODERATOR: { icon: Shield, label: 'Moderator' },
  MEMBER: { icon: UserCheck, label: 'Member' },
};

// ─── Create Club Modal ───────────────────────────────────────────────────────

const CreateClubModal: React.FC<{
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; isPrivate?: boolean }) => Promise<void>;
}> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr('Please give your club a name.'); return; }
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined, isPrivate });
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Could not create club.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">Start a Book Club</h2>
          <button onClick={onClose} className="text-[#777777] hover:text-[#1D1D1D]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1D] mb-1.5">Club Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nordic Solitude & Timber Architecture"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E5E0D8] bg-[#F8F6F1] text-sm text-[#1D1D1D] focus:outline-none focus:border-[#A0522D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1D] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will your club read and discuss?"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E5E0D8] bg-[#F8F6F1] text-sm text-[#1D1D1D] focus:outline-none focus:border-[#A0522D] resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-[#A0522D]" />
            <span className="text-xs text-[#777777] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Private club (invite / join only, hidden from discovery)
            </span>
          </label>

          {err && <p className="text-xs text-[#B23B3B]">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Club
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full border border-[#E5E0D8] text-[#777777] font-semibold text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

export const CommunityView: React.FC = () => {
  const { clubs, loading: clubsLoading, error: clubsError, createClub, joinClub, leaveClub } = useBookClubs();
  const [scope, setScope] = useState<FeedScope>('following');
  const { activities, loading: feedLoading, hasMore, loadMore, loadingMore } = useActivityFeed(scope);
  const [showCreate, setShowCreate] = useState(false);
  const [busyClub, setBusyClub] = useState<string | null>(null);

  const handleJoin = async (id: string) => {
    setBusyClub(id);
    try { await joinClub(id); } catch { /* surfaced via hook error */ } finally { setBusyClub(null); }
  };
  const handleLeave = async (id: string) => {
    setBusyClub(id);
    try { await leaveClub(id); } catch { /* noop */ } finally { setBusyClub(null); }
  };

  const scopes: { key: FeedScope; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'global', label: 'Everyone' },
    { key: 'me', label: 'You' },
  ];

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Bibliophile Network</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Reader Community</h1>
          <p className="text-xs text-[#777777] mt-1">Join reading clubs, engage in thoughtful chapter discussions, and follow fellow readers.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Club
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Book Clubs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#A0522D]" />
            <h2 className="font-serif-title text-xl font-bold text-[#1D1D1D]">Book Clubs</h2>
          </div>

          {clubsLoading ? (
            <div className="flex items-center justify-center py-16 text-[#777777]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : clubsError ? (
            <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-8 text-center text-sm text-[#B23B3B]">{clubsError}</div>
          ) : clubs.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-dashed border-[#E5E0D8] rounded-3xl p-10 text-center">
              <Sparkles className="w-8 h-8 text-[#A0522D] mx-auto mb-3" />
              <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-1">No clubs yet</h3>
              <p className="text-xs text-[#777777] mb-4">Be the first to start a reading club and gather fellow bibliophiles.</p>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-xs inline-flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Create the first club
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {clubs.map((club) => {
                const roleBadge = club.viewerRole ? ROLE_BADGE[club.viewerRole] : null;
                const RoleIcon = roleBadge?.icon;
                return (
                  <div key={club.id} className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider">Book Club</span>
                      {club.isPrivate && <Lock className="w-3.5 h-3.5 text-[#777777]" />}
                    </div>
                    <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">{club.name}</h3>
                    {club.description && <p className="text-xs text-[#777777] mb-3 line-clamp-2">{club.description}</p>}
                    {club.currentBook && (
                      <p className="text-xs text-[#777777] mb-4">
                        Reading <span className="italic">{club.currentBook.title}</span>
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#E5E0D8] text-xs">
                      <span className="text-[#777777] flex items-center gap-3">
                        <span>{club.memberCount} {club.memberCount === 1 ? 'Member' : 'Members'}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{club.discussionCount}</span>
                      </span>
                      {club.isMember ? (
                        roleBadge && club.viewerRole === 'OWNER' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[#A0522D]">
                            {RoleIcon && <RoleIcon className="w-3.5 h-3.5" />} {roleBadge.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLeave(club.id)}
                            disabled={busyClub === club.id}
                            className="px-4 py-1.5 rounded-full border border-[#E5E0D8] text-[#777777] font-bold disabled:opacity-60 flex items-center gap-1"
                          >
                            {busyClub === club.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Leave
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleJoin(club.id)}
                          disabled={busyClub === club.id}
                          className="px-4 py-1.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold disabled:opacity-60 flex items-center gap-1"
                        >
                          {busyClub === club.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Join Club
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-[#A0522D]" />
            <h2 className="font-serif-title text-xl font-bold text-[#1D1D1D]">Activity</h2>
          </div>

          <div className="flex gap-1 bg-[#EFE8DD] p-1 rounded-full">
            {scopes.map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  scope === s.key ? 'bg-[#FFFFFF] text-[#1D1D1D] shadow-warm-sm' : 'text-[#777777]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-2 shadow-warm-sm">
            {feedLoading ? (
              <div className="flex items-center justify-center py-12 text-[#777777]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-7 h-7 text-[#A0522D] mx-auto mb-2" />
                <p className="text-xs text-[#777777]">
                  {scope === 'following'
                    ? 'No activity yet. Follow readers to see what they’re reading.'
                    : 'No activity yet. Finish a book or write a review to get started.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E0D8]">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICON[a.type] ?? Sparkles;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3">
                      <div className="w-8 h-8 rounded-xl bg-[#EFE8DD] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#A0522D]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#777777] leading-relaxed">{activityText(a)}</p>
                        <span className="text-[10px] text-[#A0A0A0]">{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="p-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 rounded-2xl text-xs font-semibold text-[#A0522D] hover:bg-[#F8F6F1] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} onCreate={createClub} />}
    </div>
  );
};
