import React from 'react';
import {
  BookOpen,
  Heart,
  Users,
  FolderOpen,
  Trophy,
  BarChart2,
  Search,
  Inbox,
} from 'lucide-react';

type EmptyStatePreset =
  | 'library'
  | 'wishlist'
  | 'community'
  | 'collections'
  | 'achievements'
  | 'statistics'
  | 'search'
  | 'generic';

const PRESETS: Record<
  EmptyStatePreset,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  library:      { icon: <BookOpen className="w-10 h-10" />,   color: 'text-[#A0522D]', bg: 'bg-[var(--bg-beige)]' },
  wishlist:     { icon: <Heart className="w-10 h-10" />,      color: 'text-[#C53030]', bg: 'bg-[#FEE5E5]' },
  community:    { icon: <Users className="w-10 h-10" />,      color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]' },
  collections:  { icon: <FolderOpen className="w-10 h-10" />, color: 'text-[#7C3AED]', bg: 'bg-[#F5F3FF]' },
  achievements: { icon: <Trophy className="w-10 h-10" />,     color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' },
  statistics:   { icon: <BarChart2 className="w-10 h-10" />,  color: 'text-[#0F766E]', bg: 'bg-[#F0FDFA]' },
  search:       { icon: <Search className="w-10 h-10" />,     color: 'text-[#6B7280]', bg: 'bg-[#F9FAFB]' },
  generic:      { icon: <Inbox className="w-10 h-10" />,      color: 'text-[var(--muted)]', bg: 'bg-[var(--bg-ivory)]' },
};

interface EmptyStateProps {
  preset?: EmptyStatePreset;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  preset = 'generic',
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  const cfg = PRESETS[preset];
  const renderedIcon = icon ?? cfg.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up ${className}`}
    >
      {/* Floating icon */}
      <div
        className={`w-20 h-20 rounded-3xl ${cfg.bg} ${cfg.color} flex items-center justify-center mb-5 animate-float shadow-warm-sm`}
      >
        {renderedIcon}
      </div>

      <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-6">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] transition-all active:scale-95 shadow-warm-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
