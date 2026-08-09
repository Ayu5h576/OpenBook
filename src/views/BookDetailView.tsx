import React, { useState } from 'react';
import { Book, ViewMode } from '../types';
import { BookDetailSkeleton } from '../components/Skeleton';
import { useAIBookDetail } from '../hooks/useAI';
import { useCollections } from '../hooks/useCollections';
import { BookOpen, Heart, Bookmark, Share2, Star, ArrowLeft, Play, Sparkles, MessageSquare, Send, RefreshCw, FolderHeart, Check, X } from 'lucide-react';

interface BookDetailViewProps {
  book: Book;
  onNavigate: (view: ViewMode) => void;
  onOpenReader: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  relatedBooks: Book[];
  isLoading?: boolean;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onNavigate,
  onOpenReader,
  onToggleFavorite,
  onToggleWishlist,
  relatedBooks,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'comments' | 'ai-insights'>('overview');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const isUuidBook = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(book.id);
  const ai = useAIBookDetail(isUuidBook ? book.id : undefined);
  const { collections, loading: collectionsLoading, addBook: addBookToCollection } = useCollections();

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <BookDetailSkeleton />
      </div>
    );
  }

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
    <div className="space-y-8 pb-12">
      
      {/* Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Bookstore Showcase Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-lg grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* Large 3D Cover */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-56 sm:w-64 h-80 sm:h-96 rounded-2xl overflow-hidden shadow-book border border-[#E5E0D8] bg-[#EFE8DD] relative group transform hover:rotate-y-3 transition-transform duration-500">
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent" />
          </div>

          {/* Quick Actions Under Cover */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => onToggleFavorite(book.id)}
              className={`p-3 rounded-2xl border transition-all ${
                book.favorite ? 'bg-red-50 border-red-200 text-red-600' : 'border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1]'
              }`}
              title="Favorite Volume"
            >
              <Heart className={`w-5 h-5 ${book.favorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onToggleWishlist(book.id)}
              className={`p-3 rounded-2xl border transition-all ${
                book.status === 'wishlist' ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1]'
              }`}
              title="Save to Wishlist"
            >
              <Bookmark className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Book link copied to clipboard!");
              }}
              className="p-3 rounded-2xl border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all"
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
                <span key={g} className="text-[11px] font-bold uppercase tracking-wider bg-[#EFE8DD] text-[#A0522D] px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <h1 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#1D1D1D] mb-2">
              {book.title}
            </h1>

            <p className="text-base text-[#777777] font-medium">
              by <span className="text-[#1D1D1D] font-bold underline cursor-pointer" onClick={() => onNavigate('author')}>{book.author}</span>
            </p>

            {/* Rating Stars & Metadata Grid */}
            <div className="flex items-center gap-4 my-4 text-xs">
              <div className="flex items-center gap-1.5 text-[#B8860B] font-bold bg-[#FFF8E7] px-3 py-1 rounded-full">
                <Star className="w-4 h-4 fill-current" />
                <span>{book.rating}</span>
                <span className="text-[#777777] font-normal">({book.reviewCount} reviews)</span>
              </div>
              <span className="text-[#777777]">•</span>
              <span className="text-[#777777]">{book.pages} pages</span>
              <span className="text-[#777777]">•</span>
              <span className="text-[#777777]">{book.language}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-[#777777] leading-relaxed font-normal my-4">
              {book.description}
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#E5E0D8]">
            <button
              onClick={() => onOpenReader(book)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-sm hover:bg-[#333333] transition-all shadow-warm-md"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Now</span>
            </button>

            <button
              onClick={() => setShowTrailerModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#EFE8DD] text-[#1D1D1D] font-bold text-sm hover:bg-[#E5DCCF] transition-all"
            >
              <Play className="w-4 h-4 fill-current text-[#A0522D]" />
              <span>Book Trailer</span>
            </button>

            <button
              onClick={() => setShowCollectionModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] font-bold text-sm hover:bg-[#EFE8DD] transition-all shadow-warm-sm"
            >
              <FolderHeart className="w-4 h-4 text-[#A0522D]" />
              <span>Add to Collection</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-insights')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] font-bold text-sm hover:bg-[#EFE8DD] transition-all shadow-warm-sm"
            >
              <Sparkles className="w-4 h-4 text-[#B8860B]" />
              <span>AI Literary Summary</span>
            </button>
          </div>

          {/* Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8F6F1] rounded-2xl border border-[#E5E0D8] text-xs">
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Publisher</span>
              <span className="font-bold text-[#1D1D1D]">{book.publisher}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Published</span>
              <span className="font-bold text-[#1D1D1D]">{book.publishedYear}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">ISBN</span>
              <span className="font-bold text-[#1D1D1D] font-mono">{book.isbn}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Format</span>
              <span className="font-bold text-[#1D1D1D]">Digital E-Book</span>
            </div>
          </div>

        </div>
      </div>

      {/* AI Detail Surface */}
      <section className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#A0522D] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini Reading Companion</span>
            </div>
            <h2 className="font-serif-title text-3xl font-bold text-[#1D1D1D]">Personalized Intelligence</h2>
            {!isUuidBook && (
              <p className="text-xs text-[#777777] mt-1">Import this book into your library to unlock database-grounded AI analysis.</p>
            )}
          </div>
          <button
            onClick={ai.retry}
            disabled={!isUuidBook || ai.loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E5E0D8] text-xs font-bold text-[#1D1D1D] hover:bg-[#F8F6F1] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ai.loading ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>

        {isUuidBook && ai.error && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{ai.error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-3">AI Summary</h3>
            {ai.summary.loading ? (
              <div className="space-y-2">
                <div className="h-3 bg-[#EFE8DD] rounded animate-pulse" />
                <div className="h-3 bg-[#EFE8DD] rounded animate-pulse w-5/6" />
                <div className="h-3 bg-[#EFE8DD] rounded animate-pulse w-2/3" />
              </div>
            ) : (
              <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">{ai.summary.data?.summary ?? 'No AI summary yet.'}</p>
            )}
          </div>

          <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-3">Book DNA</h3>
            {ai.dna.loading ? (
              <div className="h-32 bg-[#EFE8DD] rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-3">
                {dnaMetrics.map(([label, value]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-[#1D1D1D] mb-1">
                      <span>{label}</span>
                      <span>{value}/5</span>
                    </div>
                    <div className="h-2 bg-[#EFE8DD] rounded-full overflow-hidden">
                      <div className="h-full bg-[#A0522D]" style={{ width: `${(Number(value) / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-[#777777] pt-2">{ai.dna.data?.explanation}</p>
              </div>
            )}
          </div>

          <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-3">Theme Analysis</h3>
            <div className="flex flex-wrap gap-2">
              {(ai.dna.data?.dna.themes ?? []).map((theme) => (
                <span key={theme.name} className="px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold">
                  {theme.name} {Math.round(theme.weight * 100)}%
                </span>
              ))}
            </div>
            <p className="text-xs text-[#777777] mt-4">{ai.dna.data?.dna.philosophy ?? 'Theme signals will appear after AI analysis loads.'}</p>
          </div>

          <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
            <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-3">Smart Planner</h3>
            <p className="text-xs text-[#555555]">
              {ai.planner.data
                ? `${ai.planner.data.plan.dailyPages} pages/day, ${ai.planner.data.plan.weeklyGoal} pages/week. Estimated finish: ${ai.planner.data.plan.estimatedFinishDate}.`
                : 'Planner will use your measured reading speed and current page.'}
            </p>
            <p className="text-xs text-[#777777] mt-3">{ai.planner.data?.plan.adaptiveNotes}</p>
          </div>
        </div>

        <div className="mt-6 bg-[#1D1D1D] text-[#F8F6F1] rounded-2xl p-5">
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
              disabled={!isUuidBook}
              placeholder="Explain this chapter without spoilers..."
              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D]"
            />
            <button
              onClick={sendChat}
              disabled={!isUuidBook || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-[#E0A96D] text-[#1D1D1D] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1D1D1D] text-white rounded-3xl p-6 max-w-xl w-full border border-white/20 shadow-2xl text-center">
            <h3 className="font-serif-title text-2xl font-bold mb-2">Atmospheric Book Trailer</h3>
            <p className="text-xs text-[#A0A0A0] mb-6">Visual and acoustic mood showcase for {book.title}</p>
            <div className="aspect-video bg-black/60 rounded-2xl flex items-center justify-center border border-white/10 mb-6">
              <Play className="w-12 h-12 text-[#E0A96D] animate-pulse" />
            </div>
            <button
              onClick={() => setShowTrailerModal(false)}
              className="px-6 py-2.5 rounded-full bg-[#E0A96D] text-[#1D1D1D] font-bold text-xs"
            >
              Close Trailer
            </button>
          </div>
        </div>
      )}

      {/* Add to Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl p-6 max-w-md w-full border border-[#E5E0D8] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">Add to Collection</h3>
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setSelectedCollections(new Set());
                  setCollectionError(null);
                }}
                className="p-1.5 rounded-full text-[#777777] hover:bg-[#EFE8DD] transition-colors"
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
                  <div key={i} className="h-10 bg-[#EFE8DD] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-8">
                <FolderHeart className="w-8 h-8 text-[#E5E0D8] mx-auto mb-2" />
                <p className="text-xs text-[#777777]">No collections yet. Create one from the Collections view.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E0D8] hover:bg-[#F8F6F1] cursor-pointer transition-colors"
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
                      <p className="font-semibold text-xs text-[#1D1D1D]">{collection.name}</p>
                      <p className="text-[10px] text-[#777777]">{collection.books?.length ?? 0} books</p>
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
                className="px-4 py-2.5 rounded-full border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCollections}
                disabled={addingToCollection || selectedCollections.size === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] disabled:opacity-50 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {addingToCollection ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
