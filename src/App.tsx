import React, { useState, useContext } from 'react';
import { ViewMode, Book } from './types';
import { sampleBooks, sampleCollections, sampleQuotes, sampleAuthors, currentUser } from './data/mockData';
import { AuthContext } from './context/AuthContext';

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

// View Pages
import { LandingView } from './views/LandingView';
import { AuthView } from './views/AuthView';
import { HomeView } from './views/HomeView';
import { BookDetailView } from './views/BookDetailView';
import { ExploreView } from './views/ExploreView';
import { LibraryView } from './views/LibraryView';
import { WishlistView } from './views/WishlistView';
import { CollectionsView } from './views/CollectionsView';
import { ReaderView } from './views/ReaderView';
import { CommunityView } from './views/CommunityView';
import { AuthorView } from './views/AuthorView';
import { StatisticsView } from './views/StatisticsView';
import { AchievementsView } from './views/AchievementsView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext not found');
  }

  const { isAuthenticated, isLoading: authLoading } = auth;

  const [currentView, setCurrentView] = useState<ViewMode>(isAuthenticated ? 'home' : 'auth');
  const [books, setBooks] = useState<Book[]>(sampleBooks);
  const [collections] = useState(sampleCollections);
  const [quotes] = useState(sampleQuotes);
  const [selectedBook, setSelectedBook] = useState<Book>(sampleBooks[0]);
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1D1D1D] mb-4"></div>
          <p className="text-[#1D1D1D] font-serif text-lg">Loading OpenBook...</p>
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

  const handleToggleFavorite = (bookId: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, favorite: !b.favorite } : b))
    );
  };

  const handleToggleWishlist = (bookId: string) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? { ...b, status: b.status === 'wishlist' ? 'unread' : 'wishlist' }
          : b
      )
    );
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

  // Full screen standalone views without standard layout shell
  if (currentView === 'landing') {
    return (
      <LandingView
        onNavigate={setCurrentView}
        featuredBook={books[0]}
        trendingBooks={books}
      />
    );
  }

  if (currentView === 'auth') {
    return (
      <AuthView
        onNavigate={setCurrentView}
        onLoginSuccess={() => setCurrentView('home')}
      />
    );
  }

  if (currentView === 'reader' && readerBook) {
    return (
      <ReaderView
        book={readerBook}
        onExit={() => setCurrentView('home')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1D1D1D] font-sans antialiased selection:bg-[#EFE8DD] selection:text-[#1D1D1D]">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        user={currentUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCompass={() => handleNavigate('reading-compass')}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        onLogout={auth.logout}
      />

      {/* Main Layout Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex gap-8">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          
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

          {currentView === 'book-detail' && (
            <BookDetailView
              book={selectedBook}
              onNavigate={handleNavigate}
              onOpenReader={handleOpenReader}
              onToggleFavorite={handleToggleFavorite}
              onToggleWishlist={handleToggleWishlist}
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
              books={books}
              onSelectBook={handleSelectBook}
              onOpenReader={handleOpenReader}
              onNavigate={handleNavigate}
              isLoading={isLoading}
            />
          )}

          {currentView === 'wishlist' && (
            <WishlistView
              wishlistBooks={books.filter((b) => b.status === 'wishlist')}
              onSelectBook={handleSelectBook}
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
              collections={collections}
              allBooks={books}
              onSelectBook={handleSelectBook}
              onNavigate={setCurrentView}
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
            <CommunityView />
          )}

          {currentView === 'author' && (
            <AuthorView
              author={sampleAuthors[0]}
              authorBooks={books.filter((b) => b.author === sampleAuthors[0].name || b.author.includes('Elena'))}
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

        </main>

        {/* Right Dashboard Sidebar (Visible on main view screens) */}
        {(currentView === 'home' || currentView === 'explore' || currentView === 'library') && (
          <RightSidebar
            user={currentUser}
            quoteOfDay={quotes[0]}
            currentlyReadingBook={books.find((b) => b.status === 'reading')}
            quotes={quotes}
            onOpenReader={handleOpenReader}
            onNavigate={setCurrentView}
            onOpenPlanner={() => setCurrentView('smart-planner')}
            onOpenCommunity={() => setCurrentView('community')}
          />
        )}

      </div>
    </div>
  );
}

export default App;
