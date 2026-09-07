import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Loader2, MessageSquare, UserPlus, Users } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Avatar } from './Avatar';
import { timeAgo } from '../utils/timeAgo';
import type { AppNotification } from '../services/api';

/**
 * Renders the sentence for one notification from its denormalized metadata, so
 * a row still reads correctly after the club or discussion it refers to is
 * deleted. Falls back to the actor's live username only when metadata is thin.
 */
function describe(n: AppNotification): { text: string; icon: React.ReactNode } {
  const who = (n.metadata.actorUsername as string) || n.actor?.username || 'Someone';

  switch (n.type) {
    case 'FOLLOWED_YOU':
      return {
        text: `${who} started following you`,
        icon: <UserPlus className="w-3.5 h-3.5 text-[#A0522D]" />,
      };
    case 'COMMENTED_ON_DISCUSSION':
      return {
        text: `${who} replied to "${n.metadata.discussionTitle || 'your discussion'}"`,
        icon: <MessageSquare className="w-3.5 h-3.5 text-[#3E6B89]" />,
      };
    case 'JOINED_YOUR_CLUB':
      return {
        text: `${who} joined ${n.metadata.clubName || 'your club'}`,
        icon: <Users className="w-3.5 h-3.5 text-[#6B7A3E]" />,
      };
    default:
      return { text: `${who} did something`, icon: <Bell className="w-3.5 h-3.5" /> };
  }
}

/** Where clicking a notification should take the reader. */
function destination(n: AppNotification): string | null {
  switch (n.type) {
    case 'FOLLOWED_YOU':
      return n.actor ? `/profile/${n.actor.id}` : null;
    case 'COMMENTED_ON_DISCUSSION':
      return n.metadata.clubId && n.metadata.discussionId
        ? `/clubs/${n.metadata.clubId}?discussion=${n.metadata.discussionId}`
        : null;
    case 'JOINED_YOUR_CLUB':
      return n.metadata.clubId ? `/clubs/${n.metadata.clubId}` : null;
    default:
      return null;
  }
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // The list is only fetched while the panel is open; the unread count polls
  // regardless so the badge stays live.
  const {
    notifications, unreadCount, loading, loadingMore, error,
    hasMore, loadMore, markRead, markAllRead,
  } = useNotifications(open);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpenRow = (n: AppNotification) => {
    markRead(n.id);
    const to = destination(n);
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className={`relative p-2 rounded-full border transition-all active:scale-95 ${
          open
            ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg-ivory)]'
            : 'bg-[var(--white)] border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)]'
        }`}
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C53030] text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-[var(--white)] border border-[var(--border-light)] rounded-2xl shadow-warm-md overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)]">
            <h3 className="font-serif-title text-sm font-bold text-[var(--ink)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-[var(--muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : error ? (
              <p className="px-4 py-8 text-center text-xs text-[#B23B3B]">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                Nothing yet. Follows, replies, and club joins will land here.
              </p>
            ) : (
              notifications.map((n) => {
                const { text, icon } = describe(n);
                const clickable = destination(n) !== null;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpenRow(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[var(--border-light)] last:border-b-0 transition-colors ${
                      n.read ? 'hover:bg-[var(--bg-beige)]' : 'bg-[var(--bg-beige)]/60 hover:bg-[var(--bg-beige)]'
                    } ${clickable ? '' : 'cursor-default'}`}
                  >
                    <Avatar
                      username={(n.metadata.actorUsername as string) || n.actor?.username || 'Reader'}
                      avatar={n.actor?.avatar}
                      size="w-8 h-8"
                      shape="rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--ink)] leading-snug">{text}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {icon}
                        <span className="text-[10px] text-[var(--muted)]">
                          {timeAgo(n.createdAt, { granularity: 'justNow' })}
                        </span>
                      </div>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#C53030] shrink-0 mt-1.5" aria-label="Unread" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {hasMore && !loading && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] border-t border-[var(--border-light)] transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load older'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
