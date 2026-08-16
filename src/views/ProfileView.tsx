import React, { useState, useContext } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserCheck, UserPlus, Users } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { AuthContext } from '../context/AuthContext';
import type { UserSummary } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BackButton: React.FC<{ onBack: () => void; label?: string }> = ({ onBack, label = 'Back' }) => (
  <button
    onClick={onBack}
    className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
  >
    <ArrowLeft className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const Avatar: React.FC<{ username: string; avatar?: string | null; size?: string; textSize?: string }> = ({
  username, avatar, size = 'w-8 h-8', textSize = 'text-xs',
}) => (
  <div className={`${size} rounded-2xl bg-[var(--bg-beige)] flex items-center justify-center shrink-0 overflow-hidden`}>
    {avatar ? (
      <img src={avatar} alt={username} className="w-full h-full object-cover" />
    ) : (
      <span className={`${textSize} font-bold text-[#A0522D]`}>{username.charAt(0).toUpperCase()}</span>
    )}
  </div>
);

// ─── User List (followers / following) ───────────────────────────────────────

const UserList: React.FC<{
  users: UserSummary[];
  emptyLabel: string;
  currentId: string;
  onOpenProfile: (u: UserSummary) => void;
}> = ({ users, emptyLabel, currentId, onOpenProfile }) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Users className="w-7 h-7 text-[#A0522D] mx-auto mb-2" />
        <p className="text-xs text-[var(--muted)]">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-[var(--border-light)]">
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => u.id !== currentId && onOpenProfile(u)}
          disabled={u.id === currentId}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-ivory)] transition-colors disabled:cursor-default disabled:hover:bg-transparent"
        >
          <Avatar username={u.username} avatar={u.avatar} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ink)] truncate">{u.username}</p>
            {u.bio && <p className="text-xs text-[var(--muted)] truncate">{u.bio}</p>}
          </div>
          {u.id === currentId && <span className="text-[10px] text-[#A0A0A0] shrink-0">Viewing</span>}
        </button>
      ))}
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

type ProfileTab = 'followers' | 'following';

export const ProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);
  
  // Since we don't have an endpoint to fetch user details by ID, we rely on state
  // being passed when navigating, or fallback to the logged-in user if the ID matches.
  const stateUser = location.state?.user as UserSummary | undefined;
  const isMe = id === auth?.user?.id;
  
  let user = stateUser;
  if (!user && isMe && auth?.user) {
    user = {
      id: auth.user.id,
      username: auth.user.username,
      avatar: auth.user.avatar,
      bio: auth.user.bio,
    };
  }

  const { stats, followers, following, isFollowing, isSelf, loading, error, busy, toggleFollow } =
    useProfile(id as string, auth?.user?.id);
  const [tab, setTab] = useState<ProfileTab>('followers');

  if (!id || !user) {
    // We cannot display a profile without user details. Navigate back or to community.
    return <Navigate to="/community" />;
  }

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: 'followers', label: 'Followers', count: stats.followers },
    { key: 'following', label: 'Following', count: stats.following },
  ];

  return (
    <div className="space-y-8 pb-12">
      <BackButton onBack={() => navigate(-1)} />

      {/* Header card */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar username={user.username} avatar={user.avatar} size="w-20 h-20" textSize="text-3xl" />

          <div className="min-w-0 flex-1">
            <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)] truncate">{user.username}</h1>
            {user.bio && <p className="text-sm text-[var(--muted)] leading-relaxed mt-2 max-w-2xl">{user.bio}</p>}
            <div className="flex items-center gap-5 mt-4 text-xs text-[var(--muted)]">
              <span><span className="font-bold text-[var(--ink)]">{stats.followers}</span> Followers</span>
              <span><span className="font-bold text-[var(--ink)]">{stats.following}</span> Following</span>
            </div>
          </div>

          {isSelf ? (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-bold shrink-0">
              <UserCheck className="w-4 h-4" /> This is you
            </span>
          ) : auth?.user?.id ? (
            isFollowing ? (
              <button
                onClick={toggleFollow}
                disabled={busy}
                className="px-5 py-2.5 rounded-full border border-[var(--border-light)] text-[var(--muted)] font-bold text-sm hover:bg-[var(--bg-ivory)] disabled:opacity-60 flex items-center gap-2 shrink-0"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Following
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={busy}
                className="px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm hover:bg-[#333333] disabled:opacity-60 flex items-center gap-2 shrink-0"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Follow
              </button>
            )
          ) : null}
        </div>
        {error && <p className="text-xs text-[#B23B3B] mt-4">{error}</p>}
      </div>

      {/* Followers / Following */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-[var(--bg-beige)] p-1 rounded-full max-w-xs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tab === t.key ? 'bg-[var(--white)] text-[var(--ink)] shadow-warm-sm' : 'text-[var(--muted)]'
              }`}
            >
              {t.label} <span className="text-[#A0A0A0]">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl shadow-warm-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--muted)]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : tab === 'followers' ? (
            <UserList
              users={followers}
              currentId={user.id}
              onOpenProfile={(u) => navigate(`/profile/${u.id}`, { state: { user: u } })}
              emptyLabel={isSelf ? 'No followers yet. Share what you’re reading to attract fellow readers.' : `${user.username} has no followers yet.`}
            />
          ) : (
            <UserList
              users={following}
              currentId={user.id}
              onOpenProfile={(u) => navigate(`/profile/${u.id}`, { state: { user: u } })}
              emptyLabel={isSelf ? 'You’re not following anyone yet. Explore the community to find readers.' : `${user.username} isn’t following anyone yet.`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
