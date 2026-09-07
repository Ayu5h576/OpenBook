import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, Sparkles, BookOpen, UserCheck, Plus, X, Loader2,
  Crown, Shield, Lock, Award, UserPlus, PenSquare, Star, Rss, Search, UserSearch,
} from 'lucide-react';
import { useBookClubs } from '../hooks/useBookClubs';
import { useActivityFeed, FeedScope } from '../hooks/useActivityFeed';
import { useReaderDiscovery } from '../hooks/useReaderDiscovery';
import type { ActivityItem, ActivityType, UserSummary } from '../services/api';
import { ClubCardSkeleton, ActivityItemSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from '../components/Avatar';
import { timeAgo } from '../utils/timeAgo';
import { ErrorBanner } from '../components/ErrorBanner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function activityText(a: ActivityItem, navigate: (path: string) => void): React.ReactNode {
  const who = (
    <button
      onClick={() => navigate(`/profile/${a.actor.id}`)}
      className="font-semibold text-[var(--ink)] hover:text-[#A0522D] transition-colors"
    >
      {a.actor.username}
    </button>
  );
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
      return <>{who} followed {meta.targetUsername ? <span className="font-semibold text-[var(--ink)]">{meta.targetUsername}</span> : 'a new reader'}</>;
    case 'CREATED_CLUB':
      return <>{who} created the club {meta.clubName ? <span className="font-semibold text-[var(--ink)]">{meta.clubName}</span> : ''}</>;
    case 'JOINED_CLUB':
      return <>{who} joined {meta.clubName ? <span className="font-semibold text-[var(--ink)]">{meta.clubName}</span> : 'a book club'}</>;
    case 'POSTED_DISCUSSION':
      return <>{who} started a discussion{meta.discussionTitle ? <>: <span className="italic">{meta.discussionTitle}</span></> : ''}</>;
    case 'UNLOCKED_ACHIEVEMENT':
      return <>{who} unlocked {meta.achievementTitle ? <span className="font-semibold text-[var(--ink)]">{meta.achievementTitle}</span> : 'an achievement'}</>;
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md w-full max-w-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Start a Book Club</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Club Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nordic Solitude & Timber Architecture"
              className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will your club focus on?"
              className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D] resize-none"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded text-[#A0522D] focus:ring-[#A0522D]"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--ink)]">Private Club</span>
              <span className="text-[10px] text-[var(--muted)]">Only approved members can join and view activity.</span>
            </div>
          </label>

          {err && <p className="text-xs text-[#B23B3B]">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Club
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full border border-[var(--border-light)] text-[var(--muted)] font-semibold text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Find Readers ────────────────────────────────────────────────────────────

/**
 * Search + suggestions in one panel. Without this the follow graph has no entry
 * point: the circle feed only shows readers you already follow or share a club
 * with, so a new user would otherwise have no way to find anybody.
 */
const FindReadersPanel: React.FC<{ onOpenProfile: (id: string) => void }> = ({ onOpenProfile }) => {
  const {
    query, setQuery, results, suggestions, searching,
    loadingSuggestions, error, busyId, toggleFollow,
  } = useReaderDiscovery();

  // `results === null` means no active search, so fall back to suggestions.
  const showingSearch = results !== null;
  const list = showingSearch ? results : suggestions;
  const loading = showingSearch ? searching : loadingSuggestions;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserSearch className="w-4 h-4 text-[#A0522D]" />
        <h2 className="font-serif-title text-xl font-bold text-[var(--ink)]">Find Readers</h2>
      </div>

      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-4 shadow-warm-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search readers by username…"
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {error && <ErrorBanner message={error} />}

        {!showingSearch && !loadingSuggestions && suggestions.length > 0 && (
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold px-1">
            Readers you may like
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-[#A0522D]" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-6 px-2">
            {showingSearch
              ? `No readers match “${query.trim()}”.`
              : 'No suggestions yet. Join a club to meet readers with similar taste.'}
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {list.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => onOpenProfile(u.id)} className="shrink-0">
                  <Avatar username={u.username} avatar={u.avatar} size="w-9 h-9" shape="rounded-2xl" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onOpenProfile(u.id)}
                    className="block text-sm font-semibold text-[var(--ink)] hover:text-[#A0522D] transition-colors truncate"
                  >
                    {u.username}
                  </button>
                  <p className="text-[10px] text-[var(--muted)] truncate">
                    {u.reason ?? u.bio ?? 'Reader on OpenBook'}
                  </p>
                </div>
                <button
                  onClick={() => toggleFollow(u.id)}
                  disabled={busyId === u.id}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
                    u.isFollowing
                      ? 'border border-[var(--border-light)] text-[var(--muted)]'
                      : 'bg-[var(--ink)] text-[var(--bg-ivory)]'
                  }`}
                >
                  {busyId === u.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : u.isFollowing ? (
                    <UserCheck className="w-3 h-3" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  {u.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

export const CommunityView: React.FC = () => {
  const navigate = useNavigate();
  const { clubs, loading: clubsLoading, error: clubsError, createClub, joinClub, leaveClub } = useBookClubs();
  const [scope, setScope] = useState<FeedScope>('circle');
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
    { key: 'circle', label: 'My Circle' },
    { key: 'me', label: 'You' },
  ];

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Bibliophile Network</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Reader Community</h1>
          <p className="text-xs text-[var(--muted)] mt-1">Join reading clubs, engage in thoughtful chapter discussions, and follow fellow readers.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Club
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Book Clubs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#A0522D]" />
            <h2 className="font-serif-title text-xl font-bold text-[var(--ink)]">Book Clubs</h2>
          </div>

          {clubsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <ClubCardSkeleton key={i} />)}
            </div>
          ) : clubsError ? (
            <ErrorBanner message={clubsError} />
          ) : clubs.length === 0 ? (
            <EmptyState
              preset="community"
              title="No clubs yet"
              description="Be the first to start a reading club and gather fellow bibliophiles."
              action={{ label: 'Create the first club', onClick: () => setShowCreate(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {clubs.map((club) => {
                const roleBadge = club.viewerRole ? ROLE_BADGE[club.viewerRole] : null;
                const RoleIcon = roleBadge?.icon;
                return (
                  <div
                    key={club.id}
                    onClick={() => navigate(`/clubs/${club.id}`)}
                    className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm hover:shadow-warm-md transition-shadow cursor-pointer flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider">Book Club</span>
                      {club.isPrivate && <Lock className="w-3.5 h-3.5 text-[var(--muted)]" />}
                    </div>
                    <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] my-1">{club.name}</h3>
                    {club.description && <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2">{club.description}</p>}
                    {club.currentBook && (
                      <p className="text-xs text-[var(--muted)] mb-4">
                        Reading <span className="italic">{club.currentBook.title}</span>
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-[var(--border-light)] text-xs">
                      <span className="text-[var(--muted)] flex items-center gap-3">
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
                            onClick={(e) => { e.stopPropagation(); handleLeave(club.id); }}
                            disabled={busyClub === club.id}
                            className="px-4 py-1.5 rounded-full border border-[var(--border-light)] text-[var(--muted)] font-bold disabled:opacity-60 flex items-center gap-1"
                          >
                            {busyClub === club.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Leave
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleJoin(club.id); }}
                          disabled={busyClub === club.id}
                          className="px-4 py-1.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold disabled:opacity-60 flex items-center gap-1"
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

        {/* Sidebar: reader discovery above the feed it fills */}
        <div className="space-y-8">
          <FindReadersPanel onOpenProfile={(id) => navigate(`/profile/${id}`)} />

          {/* Activity Feed */}
          <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-[#A0522D]" />
            <h2 className="font-serif-title text-xl font-bold text-[var(--ink)]">Activity</h2>
          </div>

          <div className="flex gap-1 bg-[var(--bg-beige)] p-1 rounded-full">
            {scopes.map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  scope === s.key ? 'bg-[var(--white)] text-[var(--ink)] shadow-warm-sm' : 'text-[var(--muted)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-2 shadow-warm-sm">
            {feedLoading ? (
              <div className="p-3 space-y-1">
                {Array.from({ length: 5 }).map((_, i) => <ActivityItemSkeleton key={i} />)}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-7 h-7 text-[#A0522D] mx-auto mb-2" />
                <p className="text-xs text-[var(--muted)]">
                  {scope === 'circle'
                    ? 'Your circle is quiet. Follow a reader or join a club to fill this feed.'
                    : 'No activity yet. Finish a book or write a review to get started.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-light)]">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICON[a.type] ?? Sparkles;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-beige)] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#A0522D]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--muted)] leading-relaxed">{activityText(a, navigate)}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[#A0A0A0]">{timeAgo(a.createdAt)}</span>
                          {/* Why this row is in the merged circle feed. */}
                          {a.reason && (
                            <>
                              <span className="text-[10px] text-[#D0C8BE]">·</span>
                              <span className="text-[10px] text-[#A0A0A0]">{a.reason}</span>
                            </>
                          )}
                        </div>
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
                  className="w-full py-2 rounded-2xl text-xs font-semibold text-[#A0522D] hover:bg-[var(--bg-ivory)] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Load more
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} onCreate={createClub} />}
    </div>
  );
};
