import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Book } from '../types';
import { BookDetailSkeleton } from '../components/Skeleton';
import { useAIBookDetail } from '../hooks/useAI';
import { useCollections } from '../hooks/useCollections';
import { useLibrary } from '../hooks/useLibrary';
import { useWishlist } from '../hooks/useWishlist';
import { useToast } from '../context/ToastContext';
import { BookApiService, LocalBook } from '../services/api';
import { googleBookToApp, stripHtml } from '../utils/bookMapper';
import { ProgressTracker } from '../components/ProgressTracker';
import { BookSpread } from '../components/BookSpread';
import { BookOpen, Heart, Bookmark, Share2, Star, ArrowLeft, Play, Sparkles, MessageSquare, Send, RefreshCw, FolderHeart, Check, X, Info } from 'lucide-react';

import { createPortal } from 'react-dom';

export const BookDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isUuidBook = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) : false;

  const { data: localBook, isLoading: isBookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID');
      if (isUuidBook) {
        const res = await BookApiService.getById(id);
        return res.data?.book;
      } else {
        // If it's a google books id, we can just import it to get the full LocalBook
        const res = await BookApiService.importBook(id);
        return res.data?.book;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const { entries: libEntries, addBook: addLibraryBook } = useLibrary();
  const { entries: wishEntries, addBook: addWishlist, removeBook: removeWishlist } = useWishlist();

  const libEntry = localBook ? libEntries.find(e => e.book.id === localBook.id) : undefined;
  const wishEntry = localBook ? wishEntries.find(e => e.book.id === localBook.id) : undefined;

  const isFavorite = libEntry?.isFavorite || false;
  const isWishlist = !!wishEntry;

  // We convert the backend LocalBook to our frontend App Book for now, 
  // though eventually we might want to just use LocalBook directly.
  const book: Book | undefined = localBook ? {
    id: localBook.id,
    title: localBook.title,
    author: localBook.authors[0] || 'Unknown',
    authorId: `auth-${localBook.id}`,
    cover: localBook.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    spineColor: '#1D1D1D',
    thickness: 30,
    pages: localBook.pageCount || 300,
    pagesRead: libEntry?.currentPage || 0,
    publisher: localBook.publisher || 'Independent',
    publishedYear: localBook.publishedDate ? parseInt(localBook.publishedDate.substring(0, 4)) : 2024,
    language: localBook.language || 'English',
    isbn: localBook.isbn13 || localBook.isbn10 || '',
    rating: localBook.averageRating || 4.0,
    reviewCount: localBook.ratingsCount || 0,
    genres: localBook.categories || [],
    description: localBook.description || '',
    status: libEntry ? 'owned' : wishEntry ? 'wishlist' : 'owned',
    favorite: isFavorite,
    progress: libEntry ? Math.round(((libEntry.currentPage || 0) / (localBook.pageCount || 300)) * 100) : 0,
    lastOpened: new Date().toISOString(),
    chapters: [],
    notes: [],
    highlights: [],
    comments: [],
  } : undefined;

  const cleanDescription = stripHtml(book?.description);

  const { data: relatedBooks = [] } = useQuery({
    queryKey: ['relatedBooks', book?.genres],
    queryFn: async () => {
      if (!book || !book.genres.length) return [];
      const res = await BookApiService.search(book.genres[0], 'category', 0, 3);
      return res.data?.items?.map(googleBookToApp) || [];
    },
    enabled: !!book,
    staleTime: 1000 * 60 * 60,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'comments' | 'ai-insights'>('overview');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showSpread, setShowSpread] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const realUuid = localBook?.id;
  const ai = useAIBookDetail(realUuid);
  const { collections, loading: collectionsLoading, addBook: addBookToCollection } = useCollections();

  if (isBookLoading || !book) {
    return (
      <div className="space-y-8 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <BookDetailSkeleton />
      </div>
    );
  }

  const handleToggleWishlist = async () => {
    if (isWishlist && wishEntry) {
      await removeWishlist(wishEntry.id);
      toast.success('Removed from wishlist');
    } else {
      await addWishlist(book.id, 'MEDIUM');
      toast.success('Added to wishlist');
    }
  };

  const handleToggleFavorite = async () => {
    // Currently useLibrary does not expose toggleFavorite directly,
    // so we might just redirect them to add it to library first if they haven't.
    if (!libEntry) {
      await addLibraryBook(book.id, 'OWNED');
      toast.success('Added to library. Go to library to favorite it!');
    } else {
      toast.info('Favorite toggle is handled in Library API.');
    }
  };

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatInput('');
    setChatMessages((messages) => [...messages, { role: 'user', content: message }]);
    const response = await ai.sendChat(message, conversationId);
    if (response) {
      setConversationId(response.conversationId);
      setChatMessages((messages) => [...messages, { role: 'assistant', content: response.response }]);
    }
  };

  const handleAddToCollections = async () => {
    if (selectedCollections.size === 0) return;
    setAddingToCollection(true);
    setCollectionError(null);
    try {
      for (const collectionId of selectedCollections) {
        await addBookToCollection(collectionId, book.id);
      }
      setShowCollectionModal(false);
      setSelectedCollections(new Set());
      toast.success('Added to collections');
    } catch (err: any) {
      setCollectionError(err.message ?? 'Failed to add book to collection');
    } finally {
      setAddingToCollection(false);
    }
  };

  const dnaMetrics = ai.dna.data?.dna
    ? [
        ['Difficulty', ai.dna.data.dna.difficulty],
        ['Complexity', ai.dna.data.dna.complexity],
        ['Character Depth', ai.dna.data.dna.characterDepth],
        ['World Building', ai.dna.data.dna.worldBuilding],
        ['Adventure', ai.dna.data.dna.adventure ?? 0],
        ['Romance', ai.dna.data.dna.romance ?? 0],
        ['Mystery', ai.dna.data.dna.mystery ?? 0],
      ]
    : [];

  return (
    <div className="space-y-8 pb-12 relative">
      
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Main Bookstore Showcase Card */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-10 shadow-warm-lg grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* Large 3D Cover */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-56 sm:w-64 h-80 sm:h-96 rounded-2xl overflow-hidden shadow-book border border-[var(--border-light)] bg-[var(--bg-beige)] relative group transform hover:rotate-y-3 transition-transform duration-500">
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent" />
          </div>

          {/* Quick Actions Under Cover */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-ivory)]'
              }`}
              title="Favorite Volume"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleToggleWishlist}
              className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                isWishlist ? 'bg-[var(--ink)] text-[var(--bg-ivory)]' : 'border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-ivory)]'
              }`}
              title="Save to Wishlist"
            >
              <Bookmark className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Book link copied to clipboard!");
              }}
              className="p-3 rounded-2xl border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-ivory)] transition-all"
              title="Share Volume"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Book Information Details */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {book.genres.map((g) => (
                <span key={g} className="text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-beige)] text-[#A0522D] px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <h1 className="font-serif-title text-4xl sm:text-5xl font-bold text-[var(--ink)] mb-2">
              {book.title}
            </h1>

            <p className="text-base text-[var(--muted)] font-medium">
              by <span className="text-[var(--ink)] font-bold underline cursor-pointer" onClick={() => navigate(`/author/${book.authorId}`)}>{book.author}</span>
            </p>

            {/* Rating Stars & Metadata Grid */}
            <div className="flex items-center gap-4 my-4 text-xs">
              <div className="flex items-center gap-1.5 text-[#B8860B] font-bold bg-[#FFF8E7] px-3 py-1 rounded-full">
                <Star className="w-4 h-4 fill-current" />
                <span>{book.rating}</span>
                <span className="text-[var(--muted)] font-normal">({book.reviewCount} reviews)</span>
              </div>
              <span className="text-[var(--muted)]">•</span>
              <span className="text-[var(--muted)]">{book.pages} pages</span>
              <span className="text-[var(--muted)]">•</span>
              <span className="text-[var(--muted)]">{book.language}</span>
            </div>

            {/* Description */}
            <div className="my-4">
              <p className="text-sm text-[var(--muted)] leading-relaxed font-normal line-clamp-2 sm:line-clamp-3">
                {cleanDescription}
              </p>
              {/* Not gated on description length: the spread also carries buying
                  options and cover photos, which exist either way. */}
              <button
                onClick={() => setShowSpread(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A0522D] hover:underline mt-2"
              >
                <Info className="w-3.5 h-3.5" />
                <span>More info</span>
              </button>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--border-light)]">
            <button
              onClick={() => navigate(`/reader/${book.id}`)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm hover:bg-[#333333] transition-all shadow-warm-md active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Now</span>
            </button>

            <button
              onClick={() => setShowTrailerModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] font-bold text-sm hover:bg-[#E5DCCF] transition-all"
            >
              <Play className="w-4 h-4 fill-current text-[#A0522D]" />
              <span>Book Trailer</span>
            </button>

            <button
              onClick={() => setShowCollectionModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] font-bold text-sm hover:bg-[var(--bg-beige)] transition-all shadow-warm-sm"
            >
              <FolderHeart className="w-4 h-4 text-[#A0522D]" />
              <span>Add to Collection</span>
            </button>

            <button
              onClick={() => document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] font-bold text-sm hover:bg-[var(--bg-beige)] transition-all shadow-warm-sm"
            >
              <Sparkles className="w-4 h-4 text-[#B8860B]" />
              <span>AI Literary Summary</span>
            </button>
          </div>

          {/* Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[var(--bg-ivory)] rounded-2xl border border-[var(--border-light)] text-xs">
            <div>
              <span className="text-[var(--muted)] block text-[10px] uppercase font-semibold">Publisher</span>
              <span className="font-bold text-[var(--ink)]">{book.publisher}</span>
            </div>
            <div>
              <span className="text-[var(--muted)] block text-[10px] uppercase font-semibold">Published</span>
              <span className="font-bold text-[var(--ink)]">{book.publishedYear}</span>
            </div>
            <div>
              <span className="text-[var(--muted)] block text-[10px] uppercase font-semibold">ISBN</span>
              <span className="font-bold text-[var(--ink)] font-mono">{book.isbn}</span>
            </div>
            <div>
              <span className="text-[var(--muted)] block text-[10px] uppercase font-semibold">Format</span>
              <span className="font-bold text-[var(--ink)]">Digital E-Book</span>
            </div>
          </div>

          {/* Track where you are — manual page or a timed session. Only for
              books already in the library; otherwise there's no entry to update. */}
          {libEntry ? (
            <ProgressTracker entry={libEntry} variant="light" />
          ) : (
            <button
              onClick={async () => {
                await addLibraryBook(book.id, 'READING');
                toast.success('Added to library — track your progress below.');
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] font-bold text-sm hover:bg-[#E5DCCF] transition-all self-start"
            >
              <BookOpen className="w-4 h-4 text-[#A0522D]" />
              <span>Add to library to track progress</span>
            </button>
          )}

        </div>
      </div>

      {/* AI Detail Surface */}
      <section id="ai-section" className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini Reading Companion</span>
            </div>
            <h2 className="font-serif-title text-3xl font-bold text-[var(--ink)]">Personalized Intelligence</h2>
          </div>
          <button
            onClick={ai.retry}
            disabled={!realUuid || ai.loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-light)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-ivory)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ai.loading ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>

        {realUuid && ai.error && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{ai.error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-3">AI Summary</h3>
            {ai.summary.loading ? (
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg-beige)] rounded animate-pulse" />
                <div className="h-3 bg-[var(--bg-beige)] rounded animate-pulse w-5/6" />
                <div className="h-3 bg-[var(--bg-beige)] rounded animate-pulse w-2/3" />
              </div>
            ) : (
              <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">{ai.summary.data?.summary ?? 'No AI summary yet.'}</p>
            )}
          </div>

          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-3">Book DNA</h3>
            {ai.dna.loading ? (
              <div className="h-32 bg-[var(--bg-beige)] rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-3">
                {dnaMetrics.map(([label, value]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-[var(--ink)] mb-1">
                      <span>{label}</span>
                      <span>{value}/5</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-beige)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#A0522D]" style={{ width: `${(Number(value) / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-[var(--muted)] pt-2">{ai.dna.data?.explanation}</p>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-3">Theme Analysis</h3>
            <div className="flex flex-wrap gap-2">
              {(ai.dna.data?.dna.themes ?? []).map((theme) => (
                <span key={theme.name} className="px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold">
                  {theme.name} {Math.round(theme.weight * 100)}%
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)] mt-4">{ai.dna.data?.dna.philosophy ?? 'Theme signals will appear after AI analysis loads.'}</p>
          </div>

          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-3">Smart Planner</h3>
            <p className="text-xs text-[#555555]">
              {ai.planner.data
                ? `${ai.planner.data.plan.dailyPages} pages/day, ${ai.planner.data.plan.weeklyGoal} pages/week. Estimated finish: ${ai.planner.data.plan.estimatedFinishDate}.`
                : 'Planner will use your measured reading speed and current page.'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-3">{ai.planner.data?.plan.adaptiveNotes}</p>
          </div>
        </div>

        <div className="mt-6 bg-[var(--ink)] text-[var(--bg-ivory)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-[#E0A96D]" />
            <h3 className="font-serif-title text-xl font-bold">Chat With This Book</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-[#A0A0A0]">Ask for chapter help, theme comparisons, character analysis, vocabulary, quotes, or spoiler-safe ending context.</p>
            ) : (
              chatMessages.map((message, index) => (
                <div key={index} className={`text-xs rounded-xl px-3 py-2 ${message.role === 'user' ? 'bg-white/10 ml-8' : 'bg-[#E0A96D]/15 mr-8'}`}>
                  {message.content}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendChat();
              }}
              disabled={!realUuid}
              placeholder="Explain this chapter without spoilers..."
              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D]"
            />
            <button
              onClick={sendChat}
              disabled={!realUuid || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-[#E0A96D] text-[var(--ink)] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Next Step Recommendations */}
      {relatedBooks && relatedBooks.length > 0 && (
        <section className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Step Recommendation</span>
              </div>
              <h2 className="font-serif-title text-2xl font-bold text-[var(--ink)]">What to Read Next</h2>
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="hidden sm:block text-xs font-bold text-[var(--ink)] border border-[var(--border-light)] px-4 py-2 rounded-full hover:bg-[var(--bg-ivory)] transition-colors"
            >
              Explore Library →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedBooks.map((related) => (
              <div 
                key={related.id} 
                onClick={() => navigate(`/book/${related.id}`)}
                className="group cursor-pointer flex flex-col gap-3"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden border border-[var(--border-light)] shadow-sm bg-[var(--bg-beige)] relative">
                  <img src={related.cover} alt={related.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[var(--white)] font-bold text-xs uppercase tracking-widest bg-[var(--ink)]/80 px-4 py-2 rounded-full backdrop-blur-md">View Book</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm line-clamp-1 group-hover:text-[#A0522D] transition-colors">{related.title}</h4>
                  <p className="text-xs text-[var(--muted)]">{related.author}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modals rendered to document.body using createPortal to prevent stacking context issues */}
      
      {/* Trailer Modal */}
      {showTrailerModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--ink)] text-white rounded-3xl p-6 max-w-xl w-full border border-white/20 shadow-2xl text-center">
            <h3 className="font-serif-title text-2xl font-bold mb-2">Atmospheric Book Trailer</h3>
            <p className="text-xs text-[#A0A0A0] mb-6">Visual and acoustic mood showcase for {book.title}</p>
            <div className="aspect-video bg-black/60 rounded-2xl flex items-center justify-center border border-white/10 mb-6">
              <Play className="w-12 h-12 text-[#E0A96D] animate-pulse" />
            </div>
            <button
              onClick={() => setShowTrailerModal(false)}
              className="px-6 py-2.5 rounded-full bg-[#E0A96D] text-[var(--ink)] font-bold text-xs"
            >
              Close Trailer
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Add to Collection Modal */}
      {showCollectionModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--white)] rounded-3xl p-6 max-w-md w-full border border-[var(--border-light)] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Add to Collection</h3>
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setSelectedCollections(new Set());
                  setCollectionError(null);
                }}
                className="p-1.5 rounded-full text-[var(--muted)] hover:bg-[var(--bg-beige)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {collectionError && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {collectionError}
              </div>
            )}

            {collectionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-[var(--bg-beige)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-8">
                <FolderHeart className="w-8 h-8 text-[var(--border-light)] mx-auto mb-2" />
                <p className="text-xs text-[var(--muted)]">No collections yet. Create one from the Collections view.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-ivory)] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollections.has(collection.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedCollections);
                        if (e.target.checked) {
                          newSelected.add(collection.id);
                        } else {
                          newSelected.delete(collection.id);
                        }
                        setSelectedCollections(newSelected);
                      }}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-[var(--ink)]">{collection.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">{collection.books?.length ?? 0} books</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setSelectedCollections(new Set());
                  setCollectionError(null);
                }}
                className="px-4 py-2.5 rounded-full border border-[var(--border-light)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--bg-ivory)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCollections}
                disabled={addingToCollection || selectedCollections.size === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] disabled:opacity-50 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {addingToCollection ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* More Info Spread — buying options + cover scrapbook.
          Needs the local UUID, so it only opens once the book has resolved. */}
      {showSpread && realUuid && (
        <BookSpread
          bookId={realUuid}
          title={book.title}
          author={book.author}
          description={cleanDescription}
          onClose={() => setShowSpread(false)}
        />
      )}

    </div>
  );
};
