import React, { useState } from 'react';
import {
  ArrowLeft, Users, MessageSquare, Loader2, Lock, Crown, Shield, UserCheck,
  Plus, Send, Sparkles,
} from 'lucide-react';
import { useBookClub, useDiscussion } from '../hooks/useBookClub';
import type { UserSummary } from '../services/api';

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

const ROLE_BADGE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  OWNER: { icon: Crown, label: 'Owner' },
  MODERATOR: { icon: Shield, label: 'Moderator' },
  MEMBER: { icon: UserCheck, label: 'Member' },
};

const BackButton: React.FC<{ onBack: () => void; label?: string }> = ({ onBack, label = 'Back to Community' }) => (
  <button
    onClick={onBack}
    className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
  >
    <ArrowLeft className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const Avatar: React.FC<{ username: string; avatar?: string | null; size?: string }> = ({ username, avatar, size = 'w-8 h-8' }) => (
  <div className={`${size} rounded-xl bg-[var(--bg-beige)] flex items-center justify-center shrink-0 overflow-hidden`}>
    {avatar ? (
      <img src={avatar} alt={username} className="w-full h-full object-cover" />
    ) : (
      <span className="text-xs font-bold text-[#A0522D]">{username.charAt(0).toUpperCase()}</span>
    )}
  </div>
);

// ─── New Discussion Form ─────────────────────────────────────────────────────

const NewDiscussionForm: React.FC<{
  onCancel: () => void;
  onCreate: (data: { title: string; body: string }) => Promise<void>;
}> = ({ onCancel, onCreate }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setErr('Add a title and a message.'); return; }
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate({ title: title.trim(), body: body.trim() });
    } catch (e: any) {
      setErr(e.message || 'Could not post discussion.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we talk about?"
          className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share your thoughts, a question, or a passage…"
          className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D] resize-none"
        />
      </div>
      {err && <p className="text-xs text-[#B23B3B]">{err}</p>}
      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Post Discussion
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-full border border-[var(--border-light)] text-[var(--muted)] font-semibold text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Discussion Thread ───────────────────────────────────────────────────────

const DiscussionThread: React.FC<{
  clubId: string;
  discussionId: string;
  canComment: boolean;
  onBack: () => void;
  onOpenProfile: (u: UserSummary) => void;
}> = ({ clubId, discussionId, canComment, onBack, onOpenProfile }) => {
  const { discussion, loading, error, addComment } = useDiscussion(clubId, discussionId);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const handleAdd = async () => {
    if (!comment.trim() || posting) return;
    setPosting(true);
    try {
      await addComment(comment.trim());
      setComment('');
    } catch {
      /* surfaced via hook error */
    } finally {
      setPosting(false);
    }
  };

  if (loading || !discussion) {
    return (
      <div className="space-y-8 pb-12">
        <BackButton onBack={onBack} label="Back to Discussions" />
        {error ? (
          <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 text-center text-sm text-[#B23B3B]">{error}</div>
        ) : (
          <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 h-64 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <BackButton onBack={onBack} label="Back to Discussions" />

      {/* Original post */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <h1 className="font-serif-title text-3xl font-bold text-[var(--ink)] mb-3">{discussion.title}</h1>
        <div className="flex items-center gap-2 text-[10px] text-[#A0A0A0] mb-5">
          <button
            onClick={() => onOpenProfile(discussion.author)}
            className="font-semibold text-[#A0522D] hover:underline"
          >
            {discussion.author.username}
          </button>
          <span>·</span>
          <span>{timeAgo(discussion.createdAt)}</span>
        </div>
        <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap font-reader">{discussion.body}</p>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#A0522D]" />
          <h2 className="font-serif-title text-xl font-bold text-[var(--ink)]">
            {discussion.comments.length} {discussion.comments.length === 1 ? 'Comment' : 'Comments'}
          </h2>
        </div>

        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl shadow-warm-sm">
          {discussion.comments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-7 h-7 text-[#A0522D] mx-auto mb-2" />
              <p className="text-xs text-[var(--muted)]">
                No comments yet. {canComment ? 'Be the first to reply.' : 'Join the club to reply.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {discussion.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-4">
                  <button onClick={() => onOpenProfile(c.author)} className="shrink-0">
                    <Avatar username={c.author.username} avatar={c.author.avatar} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenProfile(c.author)}
                        className="text-xs font-semibold text-[var(--ink)] hover:text-[#A0522D] transition-colors"
                      >
                        {c.author.username}
                      </button>
                      <span className="text-[10px] text-[#A0A0A0]">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] leading-relaxed mt-1 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {canComment && (
            <div className="border-t border-[var(--border-light)] p-4">
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder="Add a comment…"
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D]"
                />
                <button
                  onClick={handleAdd}
                  disabled={posting || !comment.trim()}
                  className="w-11 p-2.5 rounded-2xl bg-[var(--ink)] text-[var(--bg-ivory)] disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

interface ClubDetailViewProps {
  clubId: string;
  onBack: () => void;
  onOpenProfile: (u: UserSummary) => void;
}

export const ClubDetailView: React.FC<ClubDetailViewProps> = ({ clubId, onBack, onOpenProfile }) => {
  const { club, discussions, loading, error, join, leave, createDiscussion } = useBookClub(clubId);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleMembership = async () => {
    if (!club) return;
    setBusy(true);
    try {
      if (club.isMember) await leave();
      else await join();
    } catch {
      /* surfaced via hook error */
    } finally {
      setBusy(false);
    }
  };

  if (loading || !club) {
    return (
      <div className="space-y-8 pb-12">
        <BackButton onBack={onBack} />
        {error ? (
          <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 text-center text-sm text-[#B23B3B]">{error}</div>
        ) : (
          <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 h-64 animate-pulse" />
        )}
      </div>
    );
  }

  // A discussion is open — show its thread instead of the club overview.
  if (selectedDiscussionId) {
    return (
      <DiscussionThread
        clubId={clubId}
        discussionId={selectedDiscussionId}
        canComment={club.isMember}
        onBack={() => setSelectedDiscussionId(null)}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <BackButton onBack={onBack} />

      {/* Header Card */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5 text-[#A0522D]" />
              <span>Book Club</span>
              {club.isPrivate && <Lock className="w-3 h-3 text-[var(--muted)]" />}
            </div>
            <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">{club.name}</h1>
            {club.description && (
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-2 max-w-2xl">{club.description}</p>
            )}
            {club.currentBook && (
              <p className="text-xs text-[var(--muted)] mt-3">
                Currently reading <span className="italic">{club.currentBook.title}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-[var(--muted)]">
              <span>{club.memberCount} {club.memberCount === 1 ? 'Member' : 'Members'}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {club.discussionCount} {club.discussionCount === 1 ? 'Discussion' : 'Discussions'}
              </span>
              <span className="text-[#A0A0A0]">
                Hosted by{' '}
                <button
                  onClick={() => onOpenProfile(club.owner)}
                  className="font-semibold text-[#A0522D] hover:underline"
                >
                  {club.owner.username}
                </button>
              </span>
            </div>
          </div>

          {club.viewerRole === 'OWNER' ? (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-bold shrink-0">
              <Crown className="w-4 h-4" /> Owner
            </span>
          ) : club.isMember ? (
            <button
              onClick={handleMembership}
              disabled={busy}
              className="px-5 py-2.5 rounded-full border border-[var(--border-light)] text-[var(--muted)] font-bold text-sm hover:bg-[var(--bg-ivory)] disabled:opacity-60 flex items-center gap-2 shrink-0"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Leave Club
            </button>
          ) : (
            <button
              onClick={handleMembership}
              disabled={busy}
              className="px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm hover:bg-[#333333] disabled:opacity-60 flex items-center gap-2 shrink-0"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Join Club
            </button>
          )}
        </div>

        {/* Members strip */}
        {club.members && club.members.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-[var(--border-light)]">
            {club.members.map((m) => {
              const badge = ROLE_BADGE[m.role];
              const Icon = badge?.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onOpenProfile(m)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[var(--bg-ivory)] border border-[var(--border-light)] hover:border-[#A0522D] transition-colors"
                >
                  <Avatar username={m.username} avatar={m.avatar} size="w-6 h-6" />
                  <span className="text-xs font-semibold text-[var(--ink)]">{m.username}</span>
                  {Icon && <Icon className="w-3 h-3 text-[#A0522D]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Discussions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#A0522D]" />
            <h2 className="font-serif-title text-xl font-bold text-[var(--ink)]">Discussions</h2>
          </div>
          {club.isMember && !showNewDiscussion && (
            <button
              onClick={() => setShowNewDiscussion(true)}
              className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> New Discussion
            </button>
          )}
        </div>

        {showNewDiscussion && club.isMember && (
          <NewDiscussionForm
            onCancel={() => setShowNewDiscussion(false)}
            onCreate={async (data) => {
              await createDiscussion(data);
              setShowNewDiscussion(false);
            }}
          />
        )}

        {discussions.length === 0 ? (
          <div className="bg-[var(--white)] border border-dashed border-[var(--border-light)] rounded-3xl p-10 text-center">
            <Sparkles className="w-8 h-8 text-[#A0522D] mx-auto mb-3" />
            <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-1">No discussions yet</h3>
            <p className="text-xs text-[var(--muted)]">
              {club.isMember ? 'Start the first discussion and get the conversation going.' : 'Join this club to start a discussion.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {discussions.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiscussionId(d.id)}
                className="w-full text-left bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-serif-title text-lg font-bold text-[var(--ink)] mb-1">{d.title}</h3>
                    <p className="text-xs text-[var(--muted)] line-clamp-2">{d.body}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[var(--muted)] shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />{d.commentCount}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-[#A0A0A0]">
                  <span className="font-semibold text-[#A0522D]">{d.author.username}</span>
                  <span>·</span>
                  <span>{timeAgo(d.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
