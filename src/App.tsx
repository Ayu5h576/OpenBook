import React, { useContext, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import { OnboardingModal, isOnboarded } from './components/OnboardingModal';
import { AppLayout } from './components/AppLayout';
import { PageLoader } from './components/PageLoader';

// View Pages (Lazy Loaded)
const LandingView = React.lazy(() => import('./views/LandingView').then(m => ({ default: m.LandingView })));
const AuthView = React.lazy(() => import('./views/AuthView').then(m => ({ default: m.AuthView })));
const HomeView = React.lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const BookDetailView = React.lazy(() => import('./views/BookDetailView').then(m => ({ default: m.BookDetailView })));
const ExploreView = React.lazy(() => import('./views/ExploreView').then(m => ({ default: m.ExploreView })));
const LibraryView = React.lazy(() => import('./views/LibraryView').then(m => ({ default: m.LibraryView })));
const WishlistView = React.lazy(() => import('./views/WishlistView').then(m => ({ default: m.WishlistView })));
const CollectionsView = React.lazy(() => import('./views/CollectionsView').then(m => ({ default: m.CollectionsView })));
const CollectionDetailView = React.lazy(() => import('./views/CollectionDetailView').then(m => ({ default: m.CollectionDetailView })));
const ClubDetailView = React.lazy(() => import('./views/ClubDetailView').then(m => ({ default: m.ClubDetailView })));
const ProfileView = React.lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const ReaderView = React.lazy(() => import('./views/ReaderView').then(m => ({ default: m.ReaderView })));
const CommunityView = React.lazy(() => import('./views/CommunityView').then(m => ({ default: m.CommunityView })));
const AuthorView = React.lazy(() => import('./views/AuthorView').then(m => ({ default: m.AuthorView })));
const StatisticsView = React.lazy(() => import('./views/StatisticsView').then(m => ({ default: m.StatisticsView })));
const AchievementsView = React.lazy(() => import('./views/AchievementsView').then(m => ({ default: m.AchievementsView })));
const SettingsView = React.lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));

// Plus the other standalone components
import { InteractiveBookshelf3D } from './components/InteractiveBookshelf3D';
import { ReadingRoom } from './components/ReadingRoom';
import { WishlistGalaxy } from './components/WishlistGalaxy';
import { BookDNA } from './components/BookDNA';
import { ReadingCompass } from './components/ReadingCompass';
import { BookMemories } from './components/BookMemories';
import { QuoteWall } from './components/QuoteWall';
import { SmartPlanner } from './components/SmartPlanner';

export function App() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  useTheme(); // Initialize theme

  if (!auth) throw new Error('AuthContext not found');

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-ivory)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ink)] mb-4"></div>
          <p className="text-[var(--ink)] font-serif text-lg">Loading OpenBook...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={auth.isAuthenticated ? <Navigate to="/home" /> : <LandingView onNavigate={(p) => navigate(`/${p}`)} featuredBook={{
            id: 'landing-featured',
            title: 'The Secret History',
            author: 'Donna Tartt',
            authorId: 'auth-donnatartt',
            cover: '',
            spineColor: '#1D1D1D',
            thickness: 40,
            pages: 544,
            pagesRead: 0,
            publisher: 'Vintage',
            publishedYear: 1992,
            language: 'English',
            isbn: '9781400031702',
            rating: 4.5,
            reviewCount: 1500,
            genres: ['Dark Academia', 'Mystery', 'Fiction'],
            description: 'A brilliant group of eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.',
            status: 'owned' as const,
            favorite: false,
            progress: 0,
            lastOpened: new Date().toISOString(),
            chapters: [],
            notes: [],
            highlights: [],
            comments: []
          }} trendingBooks={[
            {
              id: 'trending-1',
              title: 'The Secret History',
              author: 'Donna Tartt',
              authorId: 'auth-donnatartt',
              cover: '',
              spineColor: '#1D1D1D',
              thickness: 40,
              pages: 544,
              pagesRead: 0,
              publisher: 'Vintage',
              publishedYear: 1992,
              language: 'English',
              isbn: '9781400031702',
              rating: 4.5,
              reviewCount: 1500,
              genres: ['Dark Academia', 'Mystery', 'Fiction'],
              description: 'A brilliant group of eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.',
              status: 'owned' as const,
              favorite: false,
              progress: 0,
              lastOpened: new Date().toISOString(),
              chapters: [],
              notes: [],
              highlights: [],
              comments: []
            },
            {
              id: 'trending-2',
              title: 'Dune',
              author: 'Frank Herbert',
              authorId: 'auth-frankherbert',
              cover: '',
              spineColor: '#1D1D1D',
              thickness: 40,
              pages: 896,
              pagesRead: 0,
              publisher: 'Chilton Books',
              publishedYear: 1965,
              language: 'English',
              isbn: '9780441172719',
              rating: 4.8,
              reviewCount: 5000,
              genres: ['Science Fiction', 'Adventure', 'Fantasy'],
              description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
              status: 'owned' as const,
              favorite: false,
              progress: 0,
              lastOpened: new Date().toISOString(),
              chapters: [],
              notes: [],
              highlights: [],
              comments: []
            }
          ]} />} />
          <Route path="/auth" element={auth.isAuthenticated ? <Navigate to="/home" /> : <AuthView onNavigate={(p) => navigate(`/${p}`)} onLoginSuccess={() => { navigate('/home'); if (!isOnboarded()) setShowOnboarding(true); }} />} />

          {/* Protected Routes Wrapper */}
          <Route element={auth.isAuthenticated ? <AppLayout /> : <Navigate to="/landing" />}>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/home" element={<HomeView />} />
            <Route path="/explore" element={<ExploreView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/wishlist" element={<WishlistView />} />
            <Route path="/collections" element={<CollectionsView />} />
            <Route path="/collections/:id" element={<CollectionDetailView />} />
            <Route path="/community" element={<CommunityView />} />
            <Route path="/clubs/:id" element={<ClubDetailView />} />
            <Route path="/profile/:id" element={<ProfileView />} />
            <Route path="/statistics" element={<StatisticsView />} />
            <Route path="/achievements" element={<AchievementsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/book/:id" element={<BookDetailView />} />
            
            {/* The rest of the routes (currently placeholder props until views are refactored) */}
            <Route path="/bookshelf-3d" element={<InteractiveBookshelf3D books={[]} onSelectBook={()=>{}} onOpenReader={()=>{}} />} />
            <Route path="/reading-room" element={<ReadingRoom books={[]} onOpenReader={()=>{}} />} />
            <Route path="/wishlist-galaxy" element={<WishlistGalaxy wishlistBooks={[]} onSelectBook={()=>{}} />} />
            <Route path="/book-dna" element={<BookDNA books={[]} />} />
            <Route path="/reading-compass" element={<ReadingCompass allBooks={[]} onSelectBook={()=>{}} />} />
            <Route path="/book-memories" element={<BookMemories completedBooks={[]} />} />
            <Route path="/quote-wall" element={<QuoteWall quotes={[]} />} />
            <Route path="/smart-planner" element={<SmartPlanner />} />
            <Route path="/author/:id" element={<AuthorView author={undefined as any} authorBooks={[]} onSelectBook={()=>{}} />} />
          </Route>

          {/* Standalone Route (no layout) */}
          <Route path="/reader/:id" element={auth.isAuthenticated ? <ReaderView /> : <Navigate to="/auth" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </React.Suspense>

      {/* Onboarding modal */}
      {showOnboarding && (
        <OnboardingModal
          username={auth.user?.username}
          onClose={() => setShowOnboarding(false)}
          onNavigate={(view) => navigate(`/${view}`)}
        />
      )}
    </>
  );
}

export default App;
