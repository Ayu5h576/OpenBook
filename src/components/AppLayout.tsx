import React, { useState, useContext, Suspense } from 'react';
import { useOutlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RightSidebar } from './RightSidebar';
import { AuthContext } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { sampleQuotes } from '../data/mockData';
import { PageLoader } from './PageLoader';
import { m, AnimatePresence, pageVariants } from '../motion';

export function AppLayout() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Live analytics and activity feed for RightSidebar
  const { stats: analyticsStats, goal: readingGoal } = useAnalytics();
  const { activities: feedActivities } = useActivityFeed('following', 5);

  // Freeze the matched child route as an element so AnimatePresence can hold the
  // *outgoing* page mounted through its exit while the next one enters. A live
  // <Outlet/> would render the current match in both the exiting and entering
  // copies; useOutlet captures it per-render, and the differing key below keeps
  // the old subtree alive for the duration of the transition. The outlet context
  // is preserved by passing it here, exactly as the old <Outlet context> did.
  const outlet = useOutlet({ searchQuery, setSearchQuery });

  if (!auth?.isAuthenticated) {
    return null; // App.tsx routing will handle redirects
  }

  const currentPath = location.pathname.substring(1) || 'home';
  const showRightSidebar = ['home', 'explore', 'library'].includes(currentPath);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-ivory)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--bg-beige)] selection:text-[var(--ink)] transition-colors">
      <Navbar
        currentView={currentPath as any}
        onNavigate={(path) => navigate(`/${path}`)}
        authUser={auth.user ? { username: auth.user.username, avatar: auth.user.avatar } : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCompass={() => navigate('/reading-compass')}
        onOpenProfile={() => {
          if (auth.user) navigate(`/profile/${auth.user.id}`);
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        isAuthenticated={auth.isAuthenticated}
        onLogout={auth.logout}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 md:pb-12 flex gap-8">
        <Sidebar
          currentView={currentPath as any}
          onNavigate={(path) => navigate(`/${path}`)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0">
          {/* Only the routed content transitions — the navbar, sidebar, and
              right rail stay mounted so navigation feels like turning a page,
              not reloading the app. The inner Suspense keeps that chrome up
              while a lazy route chunk loads, rather than dropping to the
              full-screen loader in App.tsx. */}
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="min-w-0"
            >
              <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
            </m.div>
          </AnimatePresence>
        </main>

        {showRightSidebar && (
          <div className="hidden lg:block">
            <RightSidebar
              authUser={auth.user}
              stats={analyticsStats}
              goal={readingGoal}
              activities={feedActivities}
              quoteOfDay={sampleQuotes[0]}
              onNavigate={(path) => navigate(`/${path}`)}
              onOpenPlanner={() => navigate('/smart-planner')}
              onOpenCommunity={() => navigate('/community')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
