import React from 'react';
import { ViewMode } from '../types';
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
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const mainNavItems = [
    { id: 'home' as ViewMode, label: 'Home Dashboard', icon: Home },
    { id: 'explore' as ViewMode, label: 'Explore & Discover', icon: Compass },
    { id: 'library' as ViewMode, label: 'Personal Library', icon: Library },
    { id: 'wishlist' as ViewMode, label: 'Saved Wishlist', icon: Bookmark },
    { id: 'collections' as ViewMode, label: 'Curated Collections', icon: FolderHeart },
    { id: 'community' as ViewMode, label: 'Reader Community', icon: Users },
  ];

  const studioItems = [
    { id: 'bookshelf-3d' as ViewMode, label: 'Interactive Wooden Shelf', icon: BookOpen },
    { id: 'reading-room' as ViewMode, label: 'Reading Room Haven', icon: Coffee },
    { id: 'wishlist-galaxy' as ViewMode, label: 'Wishlist Galaxy', icon: Orbit },
    { id: 'book-dna' as ViewMode, label: 'Book DNA Taste', icon: Dna },
    { id: 'quote-wall' as ViewMode, label: 'Quote Wall', icon: QuoteIcon },
    { id: 'book-memories' as ViewMode, label: 'Book Memories', icon: History },
    { id: 'smart-planner' as ViewMode, label: 'Reading Planner', icon: CalendarDays },
  ];

  const analyticsItems = [
    { id: 'statistics' as ViewMode, label: 'Reading Analytics', icon: BarChart3 },
    { id: 'achievements' as ViewMode, label: 'Achievements & Badges', icon: Award },
    { id: 'settings' as ViewMode, label: 'Settings', icon: SettingsIcon },
  ];

  const renderNavGroup = (title: string, items: typeof mainNavItems) => (
    <div className="mb-6">
      <h3 className="text-[11px] font-semibold text-[#777777] uppercase tracking-wider px-3 mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1D1D1D] text-[#F8F6F1] shadow-warm-sm font-semibold'
                  : 'text-[#1D1D1D] hover:bg-[#EFE8DD] hover:text-[#1D1D1D]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#F8F6F1]' : 'text-[#777777]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-[#F8F6F1] border-r border-[#E5E0D8] p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="overflow-y-auto pr-1">
        {renderNavGroup('Main Navigation', mainNavItems)}
        {renderNavGroup('Library Experiences', studioItems)}
        {renderNavGroup('Insights & Account', analyticsItems)}
      </div>

      {/* Footer subtle brand badge */}
      <div className="pt-4 border-t border-[#E5E0D8] px-2 text-[11px] text-[#777777]">
        <p className="font-serif-title italic font-medium text-[#1D1D1D] text-sm mb-0.5">"A room without books is like a body without a soul."</p>
        <p className="text-[10px]">— Marcus Tullius Cicero</p>
      </div>
    </aside>
  );
};
