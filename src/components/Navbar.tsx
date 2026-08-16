import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Search, Compass, Sparkles, Moon, Sun, Coffee, Library, RotateCw, Menu } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/** Minimal user shape for navbar display — matches AuthContext's User. */
interface NavbarUser {
  username: string;
  avatar?: string;
}

interface NavbarProps {
  currentView?: string;
  onNavigate: (view: string) => void;
  authUser?: NavbarUser | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCompass?: () => void;
  onOpenProfile?: () => void;
  onToggleSidebar?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  authUser,
  searchQuery,
  onSearchChange,
  onOpenCompass,
  onOpenProfile,
  onRefresh,
  isLoading = false,
  isAuthenticated = false,
  onLogout,
}) => {
  const displayName = authUser?.username ?? 'Reader';
  const avatarUrl = authUser?.avatar ?? undefined;
  const [isLogoutLoading, setIsLogoutLoading] = React.useState(false);
  const { theme, toggleDark } = useTheme();

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
    <header className="sticky top-0 z-40 bg-[var(--bg-ivory)]/90 backdrop-blur-md border-b border-[var(--border-light)] px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link 
          to="/landing" 
          className="flex items-center gap-3 group text-left focus:outline-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[var(--ink)] text-[var(--bg-ivory)] flex items-center justify-center shadow-warm-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif-title text-2xl font-bold tracking-tight text-[var(--ink)]">OpenBook</span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] block font-medium -mt-1">Digital Library</span>
          </div>
        </Link>

        {/* Global Search Bar (with AI intent hint) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search books, authors, or ask AI (e.g. 'cozy autumn mystery')..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNavigate('explore');
              }}
              className="w-full bg-[var(--white)] border border-[var(--border-light)] rounded-full pl-10 pr-10 py-2 text-sm text-[var(--ink)] placeholder-[#999999] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all shadow-warm-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold hover:bg-[#E5DCCF] transition-all shadow-warm-sm"
            title="Emotional AI Book Recommendation"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="hidden sm:inline">Reading Compass</span>
          </button>

          {/* 3D Bookshelf Mode */}
          <Link
            to="/bookshelf-3d"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'bookshelf-3d'
                ? 'bg-[var(--ink)] text-[var(--bg-ivory)]'
                : 'bg-[var(--white)] text-[var(--ink)] border border-[var(--border-light)] hover:bg-[var(--bg-beige)]'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Shelf</span>
          </Link>

          {/* Reading Room Mode */}
          <Link
            to="/reading-room"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'reading-room'
                ? 'bg-[var(--ink)] text-[var(--bg-ivory)]'
                : 'bg-[var(--white)] text-[var(--ink)] border border-[var(--border-light)] hover:bg-[var(--bg-beige)]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-[#A0522D]" />
            <span className="hidden sm:inline">Reading Room</span>
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)] transition-all active:scale-95"
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5 text-[#B8860B]" />
              : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Simulate Refresh / Calm Reload button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Simulate data reload"
              className="p-2 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)] transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#A0522D]' : ''}`} />
            </button>
          )}

          {/* Profile Button with Dropdown */}
          <div className="relative group">
            <Link
              to="/settings"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[var(--white)] border border-[var(--border-light)] hover:border-[var(--ink)] transition-all shadow-warm-sm group-hover:bg-[var(--bg-beige)]"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--ink)] text-white flex items-center justify-center text-xs font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-[var(--ink)] hidden lg:inline">{displayName}</span>
            </Link>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white border border-[var(--border-light)] rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {isAuthenticated && onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="w-full text-left px-4 py-2.5 text-xs text-[var(--ink)] hover:bg-[var(--bg-beige)] transition-all border-b border-[var(--border-light)]"
                >
                  My Profile
                </button>
              )}
              <Link
                to="/settings"
                className="block w-full text-left px-4 py-2.5 text-xs text-[var(--ink)] hover:bg-[var(--bg-beige)] transition-all border-b border-[var(--border-light)]"
              >
                Settings
              </Link>
              {isAuthenticated && onLogout && (
                <button
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#C53030] hover:bg-[#FEE5E5] transition-all font-medium disabled:opacity-50"
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
