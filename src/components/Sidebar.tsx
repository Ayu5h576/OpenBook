import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Compass,
  Library,
  Bookmark,
  FolderHeart,
  Users,
  BarChart3,
  Award,
  Settings as SettingsIcon,
  BookOpen,
  Coffee,
  Sparkles,
  Orbit,
  Dna,
  Quote as QuoteIcon,
  CalendarDays,
  UserCheck,
  History,
  FileText
} from 'lucide-react';

interface SidebarProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const mainNavItems = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'explore', label: 'Explore & Discover', icon: Compass },
    { id: 'library', label: 'Personal Library', icon: Library },
    { id: 'wishlist', label: 'Saved Wishlist', icon: Bookmark },
    { id: 'collections', label: 'Curated Collections', icon: FolderHeart },
    { id: 'community', label: 'Reader Community', icon: Users },
  ];

  const studioItems = [
    { id: 'bookshelf-3d', label: 'Interactive Wooden Shelf', icon: BookOpen },
    { id: 'reading-room', label: 'Reading Room Haven', icon: Coffee },
    { id: 'wishlist-galaxy', label: 'Wishlist Galaxy', icon: Orbit },
    { id: 'book-dna', label: 'Book DNA Taste', icon: Dna },
    { id: 'quote-wall', label: 'Quote Wall', icon: QuoteIcon },
    { id: 'book-memories', label: 'Book Memories', icon: History },
    { id: 'smart-planner', label: 'Reading Planner', icon: CalendarDays },
  ];

  const analyticsItems = [
    { id: 'statistics', label: 'Reading Analytics', icon: BarChart3 },
    { id: 'achievements', label: 'Achievements & Badges', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const renderNavGroup = (title: string, items: typeof mainNavItems) => (
    <div className="mb-6">
      <h3 className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-3 mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              onClick={onClose}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-medium transition-all active:scale-95 ${
                isActive
                  ? 'bg-[var(--ink)] text-[var(--bg-ivory)] shadow-warm-sm font-semibold'
                  : 'text-[var(--ink)] hover:bg-[var(--bg-beige)] hover:text-[var(--ink)]'
              }`}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--bg-ivory)]' : 'text-[var(--muted)]'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  /* Mobile bottom navigation — 5 primary icons */
  const mobileNavItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="w-64 bg-[var(--bg-ivory)] border-r border-[var(--border-light)] p-4 flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)] flex-shrink-0">
        <div className="overflow-y-auto pr-1">
          {renderNavGroup('Main Navigation', mainNavItems)}
          {renderNavGroup('Library Experiences', studioItems)}
          {renderNavGroup('Insights & Account', analyticsItems)}
        </div>

        {/* Footer subtle brand badge */}
        <div className="pt-4 border-t border-[var(--border-light)] px-2 text-[11px] text-[var(--muted)]">
          <p className="font-serif-title italic font-medium text-[var(--ink)] text-sm mb-0.5">"A room without books is like a body without a soul."</p>
          <p className="text-[10px]">— Marcus Tullius Cicero</p>
        </div>
      </aside>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-ivory)]/95 backdrop-blur-md border-t border-[var(--border-light)] flex items-center justify-around px-2 py-2 shadow-warm-lg">
        {mobileNavItems.map(({ id, icon: Icon, label }) => {
          return (
            <NavLink
              key={id}
              to={`/${id}`}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${
                isActive ? 'text-[var(--ink)]' : 'text-[#999999]'
              }`}
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all ${
                    isActive ? 'bg-[var(--ink)] text-[var(--bg-ivory)]' : 'text-[#999999]'
                  }`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-[var(--ink)]' : 'text-[#999999]'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};

