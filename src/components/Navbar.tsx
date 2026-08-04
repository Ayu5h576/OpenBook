import React from 'react';
import { ViewMode, ReaderUser } from '../types';
import { currentUser as defaultUser } from '../data/mockData';
import { BookOpen, Search, Compass, Sparkles, Moon, Sun, User as UserIcon, Coffee, Library, RotateCw } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  user?: ReaderUser;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCompass?: () => void;
  onToggleSidebar?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  user = defaultUser,
  searchQuery,
  onSearchChange,
  onOpenCompass,
  onRefresh,
  isLoading = false,
  isAuthenticated = false,
  onLogout,
}) => {
  const [isLogoutLoading, setIsLogoutLoading] = React.useState(false);

  const handleLogout = async () => {
    if (onLogout) {
      try {
        setIsLogoutLoading(true);
        await onLogout();
        onNavigate('auth');
      } catch (err) {
        console.error('Logout failed:', err);
      } finally {
        setIsLogoutLoading(false);
      }
    }
  };
  return (
    <header className="sticky top-0 z-40 bg-[#F8F6F1]/90 backdrop-blur-md border-b border-[#E5E0D8] px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <button 
          onClick={() => onNavigate('landing')} 
          className="flex items-center gap-3 group text-left focus:outline-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1D1D1D] text-[#F8F6F1] flex items-center justify-center shadow-warm-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif-title text-2xl font-bold tracking-tight text-[#1D1D1D]">OpenBook</span>
            <span className="text-[10px] uppercase tracking-widest text-[#777777] block font-medium -mt-1">Digital Library</span>
          </div>
        </button>

        {/* Global Search Bar (with AI intent hint) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search books, authors, or ask AI (e.g. 'cozy autumn mystery')..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNavigate('explore');
              }}
              className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-full pl-10 pr-10 py-2 text-sm text-[#1D1D1D] placeholder-[#999999] focus:outline-none focus:border-[#1D1D1D] focus:ring-1 focus:ring-[#1D1D1D] transition-all shadow-warm-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#777777] hover:text-[#1D1D1D]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* AI Reading Compass Button */}
          <button
            onClick={onOpenCompass}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold hover:bg-[#E5DCCF] transition-all shadow-warm-sm"
            title="Emotional AI Book Recommendation"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="hidden sm:inline">Reading Compass</span>
          </button>

          {/* 3D Bookshelf Mode */}
          <button
            onClick={() => onNavigate('bookshelf-3d')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'bookshelf-3d'
                ? 'bg-[#1D1D1D] text-[#F8F6F1]'
                : 'bg-[#FFFFFF] text-[#1D1D1D] border border-[#E5E0D8] hover:bg-[#EFE8DD]'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Shelf</span>
          </button>

          {/* Reading Room Mode */}
          <button
            onClick={() => onNavigate('reading-room')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'reading-room'
                ? 'bg-[#1D1D1D] text-[#F8F6F1]'
                : 'bg-[#FFFFFF] text-[#1D1D1D] border border-[#E5E0D8] hover:bg-[#EFE8DD]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-[#A0522D]" />
            <span className="hidden sm:inline">Reading Room</span>
          </button>

          {/* Simulate Refresh / Calm Reload button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Simulate data reload"
              className="p-2 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#EFE8DD] transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#A0522D]' : ''}`} />
            </button>
          )}

          {/* Profile Button with Dropdown */}
          <div className="relative group">
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] hover:border-[#1D1D1D] transition-all shadow-warm-sm group-hover:bg-[#EFE8DD]"
            >
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
                alt={user?.name || "User"}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-xs font-medium text-[#1D1D1D] hidden lg:inline">{(user?.name || "User").split(' ')[0]}</span>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5E0D8] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => onNavigate('settings')}
                className="w-full text-left px-4 py-2.5 text-xs text-[#1D1D1D] hover:bg-[#EFE8DD] transition-all border-b border-[#E5E0D8] rounded-t-lg"
              >
                Settings
              </button>
              {isAuthenticated && onLogout && (
                <button
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#C53030] hover:bg-[#FEE5E5] transition-all rounded-b-lg font-medium disabled:opacity-50"
                >
                  {isLogoutLoading ? 'Logging out...' : 'Logout'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
