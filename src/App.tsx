import React, { useState, useContext, useEffect } from 'react';
import { ViewMode, Book } from './types';
import { sampleQuotes } from './data/mockData';
import { AuthContext } from './context/AuthContext';
import { BookApiService } from './services/api';
import type { UserSummary } from './services/api';
import { useAnalytics } from './hooks/useAnalytics';
import { useActivityFeed } from './hooks/useActivityFeed';
import { useTheme } from './hooks/useTheme';
import { useLibrary } from './hooks/useLibrary';
import { useWishlist } from './hooks/useWishlist';
import { useToast } from './context/ToastContext';
import { OnboardingModal, isOnboarded } from './components/OnboardingModal';

// Layout Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { InteractiveBookshelf3D } from './components/InteractiveBookshelf3D';
import { ReadingRoom } from './components/ReadingRoom';
import { WishlistGalaxy } from './components/WishlistGalaxy';
import { BookDNA } from './components/BookDNA';
import { ReadingCompass } from './components/ReadingCompass';
import { BookMemories } from './components/BookMemories';
import { QuoteWall } from './components/QuoteWall';
import { SmartPlanner } from './components/SmartPlanner';
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

function googleBookToApp(gb: any): Book {
  return {
    id: gb.googleBooksId || `book-${Date.now()}`,
    title: gb.title || 'Untitled',
    author: gb.authors?.[0] || 'Unknown Author',
    authorId: `auth-${gb.googleBooksId}`,
    cover: gb.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    spineColor: '#1D1D1D',
    thickness: Math.max(20, Math.min(60, (gb.pageCount || 300) / 10)),
    pages: gb.pageCount || 300,
    pagesRead: 0,
    publisher: gb.publisher || 'Independent',
    publishedYear: gb.publishedDate ? parseInt(gb.publishedDate.substring(0, 4)) : 2024,
    language: gb.language || 'English',
    isbn: gb.isbn13 || gb.isbn10 || `978-${Math.floor(Math.random() * 1000000000)}`,
    rating: gb.averageRating || 4.0,
    reviewCount: gb.ratingsCount || 0,
    genres: gb.categories || ['Fiction'],
    description: gb.description || '',
    status: 'owned' as const,
    favorite: false,
    progress: 0,
    lastOpened: new Date().toISOString().split('T')[0],
    chapters: [{ id: 1, title: 'Chapter 1', content: '' }],
    notes: [],
    highlights: [],
    comments: [],
  };
}

export function App() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext not found');
  }

  const { isAuthenticated, isLoading: authLoading } = auth;

  const [currentView, setCurrentView] = useState<ViewMode>('auth');
  const [viewKey, setViewKey] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [quotes] = useState(sampleQuotes);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [profileReturnView, setProfileReturnView] = useState<ViewMode>('community');
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useTheme(); // Initialize theme from localStorage on mount
  const toast = useToast();

  const { entries: libEntries, addBook: addLib, updateEntry: updateLib, refetch: refetchLib } = useLibrary();
  const { entries: wishEntries, addBook: addWish, removeBook: removeWish, refetch: refetchWish } = useWishlist();

  // Live analytics and activity feed for RightSidebar
  const { stats: analyticsStats, goal: readingGoal } = useAnalytics();
  const { activities: feedActivities } = useActivityFeed('following', 5);

  // Sync Google Books feed with persistent library state
  useEffect(() => {
    if (books.length > 0 && (libEntries.length > 0 || wishEntries.length > 0)) {
      let changed = false;
      const synced = books.map(book => {
        const libEntry = libEntries.find(e => e.book.googleBooksId === book.id || e.book.id === book.id);
        const wishEntry = wishEntries.find(e => e.book.googleBooksId === book.id || e.book.id === book.id);
        
        const isFav = libEntry?.isFavorite || false;
        let newStatus = book.status;
        if (wishEntry) newStatus = 'wishlist';
        else if (libEntry) newStatus = 'owned';

        if (book.favorite !== isFav || book.status !== newStatus) {
          changed = true;
          return { ...book, favorite: isFav, status: newStatus };
        }
        return book;
      });

      if (changed) {
        setBooks(synced);
        if (selectedBook) {
          const syncedSelected = synced.find(b => b.id === selectedBook.id);
          if (syncedSelected) setSelectedBook(syncedSelected);
        }
      }
    }
  }, [libEntries, wishEntries]);

  // Sync currentView when auth state changes
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && currentView === 'auth') {
        setCurrentView('home');
      } else if (!isAuthenticated && currentView !== 'auth' && currentView !== 'landing') {
        setCurrentView('auth');
      }
    }
  }, [isAuthenticated, authLoading, currentView]);

  // Fetch featured books on mount
  useEffect(() => {
    const fetchFeaturedBooks = async () => {
      try {
        const res = await BookApiService.search('fiction', 'category', 0, 12);
        if (res.data?.items) {
          const appBooks = res.data.items.map(googleBookToApp);
          setBooks(appBooks);
          if (appBooks.length > 0) {
            setSelectedBook(appBooks[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch featured books:', err);
      }
    };

    if (isAuthenticated && books.length === 0) {
      fetchFeaturedBooks();
    }
  }, [isAuthenticated]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-ivory)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ink)] mb-4"></div>
          <p className="text-[var(--ink)] font-serif text-lg">Loading OpenBook...</p>
        </div>
      </div>
    );
  }

  // Show auth view if not authenticated
  if (!isAuthenticated && currentView !== 'auth' && currentView !== 'landing') {
    return (
      <AuthView
        onNavigate={setCurrentView}
        onLoginSuccess={() => setCurrentView('home')}
      />
    );
  }

  const handleNavigate = (view: ViewMode) => {
    setIsLoading(true);
    setCurrentView(view);
    setViewKey((k) => k + 1);
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleToggleFavorite = async (bookId: string) => {
    if (!isAuthenticated) return toast.info('Please log in to save favorites');
    
    // 1. Optimistic UI update
    const currentlyFavorite = books.find(b => b.id === bookId)?.favorite || false;
    const targetFavorite = !currentlyFavorite;
    
    setBooks(prev => prev.map(b => (b.id === bookId ? { ...b, favorite: targetFavorite } : b)));
    if (selectedBook && selectedBook.id === bookId) {
      setSelectedBook({ ...selectedBook, favorite: targetFavorite });
    }

    try {
      const importRes = await BookApiService.importBook(bookId);
      if (importRes.error || !importRes.data) throw new Error(importRes.error);
      const localBookId = importRes.data.book.id;

      const existingEntry = libEntries.find(e => e.bookId === localBookId);
      if (existingEntry) {
        await updateLib(existingEntry.id, { isFavorite: targetFavorite });
      } else {
        const newEntry = await addLib(localBookId, 'OWNED');
        await updateLib(newEntry.id, { isFavorite: targetFavorite });
      }
      toast.success(targetFavorite ? 'Added to Favorites' : 'Removed from Favorites');
      refetchLib();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update favorite');
      setBooks(prev => prev.map(b => (b.id === bookId ? { ...b, favorite: currentlyFavorite } : b)));
      if (selectedBook && selectedBook.id === bookId) {
        setSelectedBook({ ...selectedBook, favorite: currentlyFavorite });
      }
    }
  };

  const handleToggleWishlist = async (bookId: string) => {
    if (!isAuthenticated) return toast.info('Please log in to use wishlist');
    
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const isCurrentlyWishlist = book.status === 'wishlist';
    
    // 1. Optimistic UI update
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: isCurrentlyWishlist ? 'owned' : 'wishlist' } : b));
    if (selectedBook && selectedBook.id === bookId) {
      setSelectedBook({ ...selectedBook, status: isCurrentlyWishlist ? 'owned' : 'wishlist' });
    }

    try {
      const importRes = await BookApiService.importBook(bookId);
      if (importRes.error || !importRes.data) throw new Error(importRes.error);
      const localBookId = importRes.data.book.id;

      const existingEntry = wishEntries.find(e => e.bookId === localBookId);
      if (existingEntry && isCurrentlyWishlist) {
        await removeWish(existingEntry.id);
        toast.info('Removed from Wishlist');
      } else if (!existingEntry && !isCurrentlyWishlist) {
        await addWish(localBookId, 'MEDIUM');
        toast.success('Added to Wishlist');
      }
      refetchWish();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update wishlist');
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: isCurrentlyWishlist ? 'wishlist' : 'owned' } : b));
      if (selectedBook && selectedBook.id === bookId) {
        setSelectedBook({ ...selectedBook, status: isCurrentlyWishlist ? 'wishlist' : 'owned' });
      }
    }
  };

  const handleAddBookToWishlist = (newBook: Partial<Book>) => {
    const fullBook: Book = {
      id: newBook.id || `rec-${Date.now()}`,
      title: newBook.title || 'Untitled Volume',
      author: newBook.author || 'Unknown Author',
      authorId: 'auth-gen',
      cover: newBook.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      spineColor: '#1D1D1D',
      thickness: 34,
      pages: newBook.pages || 280,
      pagesRead: 0,
      publisher: newBook.publisher || 'Recommended Publishing',
      publishedYear: newBook.publishedYear || 2024,
      language: 'English',
      isbn: `978-${Math.floor(Math.random() * 1000000000)}`,
      rating: newBook.rating || 4.8,
      reviewCount: 142,
      genres: newBook.genres || ['Fiction'],
      description: newBook.description || '',
      status: 'wishlist',
      favorite: false,
      progress: 0,
      lastOpened: new Date().toISOString().split('T')[0],
      chapters: [
        { id: 1, title: 'Chapter 1: Beginnings', content: 'Sample generated chapter content...' },
      ],
      notes: [],
      highlights: [],
      comments: [],
    };
    setBooks((prev) => [fullBook, ...prev]);
  };

  const handleSelectBook = (book: Book) => {
    setIsLoading(true);
    setSelectedBook(book);
    setCurrentView('book-detail');
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const handleOpenReader = (book: Book) => {
    setReaderBook(book);
    setCurrentView('reader');
  };

  const handleOpenProfile = (user: UserSummary) => {
    // Remember where we came from so Back returns there (but don't overwrite it
    // when hopping profile → profile via a followers/following list).
    if (currentView !== 'profile') setProfileReturnView(currentView);
    setSelectedUser(user);
    setCurrentView('profile');
  };

  // Full screen standalone views without standard layout shell
  if (currentView === 'landing') {
    return (
      <React.Suspense fallback={<PageLoader />}>
        <LandingView
          onNavigate={setCurrentView}
          featuredBook={books[0]}
          trendingBooks={books}
        />
      </React.Suspense>
    );
  }

  if (currentView === 'auth') {
    return (
      <React.Suspense fallback={<PageLoader />}>
        <AuthView
          onNavigate={setCurrentView}
          onLoginSuccess={() => {
            setCurrentView('home');
            if (!isOnboarded()) setShowOnboarding(true);
          }}
        />
      </React.Suspense>
    );
  }

  if (currentView === 'reader' && readerBook) {
    return (
      <React.Suspense fallback={<PageLoader />}>
        <ReaderView
          book={readerBook}
          onExit={() => setCurrentView('home')}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-ivory)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--bg-beige)] selection:text-[var(--ink)] transition-colors">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        authUser={auth.user ? { username: auth.user.username, avatar: auth.user.avatar } : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCompass={() => handleNavigate('reading-compass')}
        onOpenProfile={() => {
          const u = auth.user;
          if (u) handleOpenProfile({ id: u.id, username: u.username, avatar: u.avatar, bio: u.bio });
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        onLogout={auth.logout}
      />

      {/* Main Layout Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 md:pb-12 flex gap-8">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main key={viewKey} className="flex-1 min-w-0 animate-fade-up">
          <React.Suspense fallback={<PageLoader />}>
          
          {currentView === 'home' && (
            <HomeView
              books={books}
              onSelectBook={handleSelectBook}
              onOpenReader={handleOpenReader}
              onNavigate={handleNavigate}
              onAddBookToWishlist={handleAddBookToWishlist}
              isLoading={isLoading}
            />
          )}

          {currentView === 'book-detail' && selectedBook && (
            <BookDetailView
              book={selectedBook}
              onNavigate={handleNavigate}
              onOpenReader={handleOpenReader}
              onToggleFavorite={handleToggleFavorite}
              onToggleWishlist={handleToggleWishlist}
              onSelectBook={handleSelectBook}
              relatedBooks={books.filter((b) => b.id !== selectedBook.id).slice(0, 3)}
              isLoading={isLoading}
            />
          )}

          {currentView === 'explore' && (
            <ExploreView
              books={books}
              onSelectBook={handleSelectBook}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={isLoading}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'wishlist' && (
            <WishlistView
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'wishlist-galaxy' && (
            <WishlistGalaxy
              wishlistBooks={books.filter((b) => b.status === 'wishlist' || b.favorite)}
              onSelectBook={handleSelectBook}
            />
          )}

          {currentView === 'collections' && (
            <CollectionsView
              onNavigate={setCurrentView}
              onSelectCollection={(id) => {
                setSelectedCollectionId(id);
                setCurrentView('collection-detail');
              }}
            />
          )}

          {currentView === 'collection-detail' && selectedCollectionId && (
            <CollectionDetailView
              collectionId={selectedCollectionId}
              onNavigate={setCurrentView}
              onBack={() => setCurrentView('collections')}
            />
          )}

          {currentView === 'bookshelf-3d' && (
            <InteractiveBookshelf3D
              books={books}
              onSelectBook={handleSelectBook}
              onOpenReader={handleOpenReader}
            />
          )}

          {currentView === 'reading-room' && (
            <ReadingRoom
              books={books}
              onOpenReader={handleOpenReader}
            />
          )}

          {currentView === 'book-dna' && (
            <BookDNA books={books} />
          )}

          {currentView === 'reading-compass' && (
            <ReadingCompass
              onSelectBook={handleSelectBook}
              allBooks={books}
            />
          )}

          {currentView === 'book-memories' && (
            <BookMemories
              completedBooks={books.filter((b) => b.memoryCard)}
            />
          )}

          {currentView === 'quote-wall' && (
            <QuoteWall quotes={quotes} />
          )}

          {currentView === 'smart-planner' && (
            <SmartPlanner />
          )}

          {currentView === 'community' && (
            <CommunityView
              onOpenClub={(id) => {
                setSelectedClubId(id);
                setCurrentView('club-detail');
              }}
              onOpenProfile={handleOpenProfile}
            />
          )}

          {currentView === 'club-detail' && selectedClubId && (
            <ClubDetailView
              clubId={selectedClubId}
              onBack={() => setCurrentView('community')}
              onOpenProfile={handleOpenProfile}
            />
          )}

          {currentView === 'profile' && selectedUser && (
            <ProfileView
              key={selectedUser.id}
              user={selectedUser}
              viewerId={auth.user?.id}
              onBack={() => setCurrentView(profileReturnView)}
              onOpenProfile={handleOpenProfile}
            />
          )}

          {currentView === 'author' && (
            <AuthorView
              author={{ id: 'placeholder', name: 'Author', portrait: '', bio: 'Author details coming soon.', born: '', location: '', notableWorks: [], achievements: [], timeline: [], relatedAuthorNames: [] }}
              authorBooks={[]}
              onSelectBook={handleSelectBook}
            />
          )}

          {currentView === 'statistics' && (
            <StatisticsView />
          )}

          {currentView === 'achievements' && (
            <AchievementsView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
          </React.Suspense>
        </main>

        {/* Right Dashboard Sidebar (hidden on mobile, visible on large screens) */}
        {(currentView === 'home' || currentView === 'explore' || currentView === 'library') && (
          <div className="hidden lg:block">
            <RightSidebar
              authUser={auth.user}
              stats={analyticsStats}
              goal={readingGoal}
              activities={feedActivities}
              quoteOfDay={quotes[0]}
              onNavigate={setCurrentView}
              onOpenPlanner={() => setCurrentView('smart-planner')}
              onOpenCommunity={() => setCurrentView('community')}
            />
          </div>
        )}

      </div>

      {/* Onboarding modal — shown once on first login */}
      {showOnboarding && (
        <OnboardingModal
          username={auth.user?.username}
          onClose={() => setShowOnboarding(false)}
          onNavigate={(view) => handleNavigate(view as ViewMode)}
        />
      )}

    </div>
  );
}

export default App;
