import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReaderSettings, Chapter } from '../types';
import { AIApiService, BookApiService, LibraryApiService } from '../services/api';
import { BookDetailSkeleton } from '../components/Skeleton';
import { SelectionToolbar } from '../components/SelectionToolbar';
import { AnnotationsPanel } from '../components/AnnotationsPanel';
import { StudyPanel } from '../components/StudyPanel';
import { useNotes, HighlightColor } from '../hooks/useNotes';
import { segmentParagraph } from '../utils/highlightText';
import { HIGHLIGHT_MARK_BG } from '../utils/highlightStyles';
import {
  ArrowLeft,
  Settings,
  Type,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Sparkles,
  BookMarked,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Search,
  Highlighter,
  StickyNote
} from 'lucide-react';

export const ReaderView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isUuidBook = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) : false;

  const { data: localBook, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID');
      if (isUuidBook) {
        const res = await BookApiService.getById(id);
        return res.data?.book;
      } else {
        const res = await BookApiService.importBook(id);
        return res.data?.book;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);

  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    fontFamily: 'Newsreader',
    fontSize: 18,
    lineHeight: 1.7,
    marginWidth: 'medium',
    theme: 'ivory',
    brightness: 100,
  });

  // Reading Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRead((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const queryClient = useQueryClient();

  // Annotations are stored on the reader's LibraryEntry for this book. The
  // reader can open any book, owned or not, so resolve the entry first and keep
  // the annotation surface disabled until we know there is somewhere to save.
  const { data: entryData, isLoading: entryLoading } = useQuery({
    queryKey: ['library', 'by-book', localBook?.id ?? ''],
    enabled: !!localBook?.id,
    queryFn: async () => {
      const res = await LibraryApiService.resolveEntryByBook(localBook!.id);
      if (res.error) throw new Error(res.error);
      return res.data?.entry ?? null;
    },
  });
  const entryId = entryData?.id ?? null;
  const annotations = useNotes(entryId);

  const [showAnnotations, setShowAnnotations] = useState(false);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [annotateErr, setAnnotateErr] = useState<string | null>(null);
  const [selToolbar, setSelToolbar] = useState<{ x: number; y: number; text: string } | null>(null);
  const [composer, setComposer] = useState<{ text: string } | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  // Escape closes the annotation toolbar or the note composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelToolbar(null);
        setComposer(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isLoading || !localBook) {
    return (
      <div className="min-h-screen bg-[var(--bg-ivory)] flex flex-col items-center justify-center p-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ink)] mb-4"></div>
        <p className="text-[var(--ink)] font-serif text-lg">Preparing your book...</p>
      </div>
    );
  }

  // Use DB chapters if they exist, else generate a placeholder chapter
  // Assuming LocalBook might have chapters in the future, currently we mock it based on description
  const chapters: Chapter[] = [
    {
      id: 1,
      title: "Chapter 1",
      content: localBook.description || "The beginning of the story..."
    }
  ];

  const activeChapter = chapters[currentChapterIdx] || chapters[0];

  // Chapters are 1-based in the store (validators enforce min 1).
  const chapterNum = currentChapterIdx + 1;
  const annotateCount = annotations.notes.length + annotations.highlights.length;
  // The API returns the color as an open string; the palette lookup below
  // narrows it to a HighlightColor before indexing the style map.
  const highlightColorById = new Map<string, string>(
    annotations.highlights.map((h) => [h.id, h.color])
  );
  // Only replay highlights that were saved against the chapter on screen.
  const activeChapterHighlights = annotations.highlights.filter(
    (h) => (h.chapter ?? chapterNum) === chapterNum
  );

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  /** Capture a just-finished text selection inside the article for annotating. */
  const handleArticleMouseUp = () => {
    if (!entryId || composer) return; // nowhere to save yet, or already composing
    const selection = window.getSelection?.();
    const text = selection?.toString().trim() ?? '';
    if (!text) {
      setSelToolbar(null); // a plain click on the page dismisses a stale toolbar
      return;
    }
    if (text.length > 2000) return; // matches the highlight validator ceiling
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!articleRef.current || !articleRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    setSelToolbar({
      text,
      // Rendered fixed, so store viewport coords; keep it on-screen and just
      // above the passage. The toolbar is ~200px wide, hence the right clamp.
      x: clamp(rect.left, 8, Math.max(8, window.innerWidth - 216)),
      y: clamp(rect.top - 46, 8, Math.max(8, rect.top)),
    });
  };

  const applyHighlight = async (color: HighlightColor) => {
    if (!selToolbar) return;
    try {
      await annotations.addHighlight({ text: selToolbar.text, color, chapter: chapterNum });
      setSelToolbar(null);
    } catch {
      setAnnotateErr('Could not save that highlight. Please try again.');
    }
  };

  const openNoteComposer = () => {
    if (!selToolbar) return;
    // Prefill with the passage so the note keeps its context unless the reader
    // edits it away.
    setComposer({ text: selToolbar.text });
  };

  const saveNote = async () => {
    const text = composer?.text.trim();
    if (!text) return;
    try {
      await annotations.addNote({ text, chapter: chapterNum });
      setComposer(null);
      setSelToolbar(null);
    } catch {
      setAnnotateErr('Could not save your note. Please try again.');
    }
  };

  const addBookToLibrary = async () => {
    setAddingToLibrary(true);
    try {
      const res = await LibraryApiService.addToLibrary(localBook.id);
      if (res.error) throw new Error(res.error);
      await queryClient.invalidateQueries({ queryKey: ['library', 'by-book', localBook.id] });
      setAnnotateErr(null);
    } catch {
      setAnnotateErr('Could not add this book to your library. Please try again.');
    } finally {
      setAddingToLibrary(false);
    }
  };

  /** A chapter paragraph, with any saved highlights wrapped in <mark>. */
  const renderParagraph = (para: string, i: number) => {
    const segments = activeChapterHighlights.length > 0 ? segmentParagraph(para, activeChapterHighlights) : null;
    return (
      <p
        key={i}
        className="mb-6 first-letter:float-left first-letter:text-4xl first-letter:font-serif-title first-letter:mr-2 first-letter:font-bold"
      >
        {segments
          ? segments.map((s, j) =>
              s.id ? (
                <mark
                  key={j}
                  data-highlight-id={s.id}
                  style={{
                    backgroundColor: HIGHLIGHT_MARK_BG[highlightColorById.get(s.id) as HighlightColor] ?? HIGHLIGHT_MARK_BG.amber,
                  }}
                  className="rounded-sm px-0.5 text-inherit"
                >
                  {s.text}
                </mark>
              ) : (
                <React.Fragment key={j}>{s.text}</React.Fragment>
              )
            )
          : para}
      </p>
    );
  };

  // Theme styling mapping
  const getThemeStyle = () => {
    switch (readerSettings.theme) {
      case 'parchment':
        return { bg: '#F5EBE0', text: '#2B2118', border: '#E0D4C5' };
      case 'sepia':
        return { bg: '#FAF0E6', text: '#3E2723', border: '#E0D0C0' };
      case 'dark-velvet':
        return { bg: '#1D1D1D', text: '#F8F6F1', border: '#333333' };
      case 'midnight':
        return { bg: '#0F111A', text: '#E0E1DD', border: '#222533' };
      case 'ivory':
      default:
        return { bg: '#F8F6F1', text: '#1D1D1D', border: '#E5E0D8' };
    }
  };

  const themeStyle = getThemeStyle();

  // TTS Web Speech Synthesis
  const toggleTts = () => {
    if (isPlayingTts) {
      window.speechSynthesis.cancel();
      setIsPlayingTts(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(activeChapter.content);
      utterance.onend = () => setIsPlayingTts(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingTts(true);
    }
  };

  // AI Assistant Call
  const handleAskAi = async () => {
    if (!aiPrompt.trim()) return;
    if (!isUuidBook) {
      setAiResponse('Import this book into your library first so OpenBook can answer from your real reading data.');
      return;
    }
    setLoadingAi(true);
    try {
      const response = await AIApiService.chat({
        bookId: localBook.id,
        message: aiPrompt,
        context: `Chapter: ${activeChapter.title}\nReader excerpt: ${activeChapter.content.slice(0, 4000)}`,
      });
      setAiResponse(response.data?.response ?? response.error ?? 'Failed to generate AI response.');
    } catch (err) {
      setAiResponse("Failed to generate AI response.");
    } finally {
      setLoadingAi(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto transition-colors duration-500"
      style={{ backgroundColor: themeStyle.bg, color: themeStyle.text }}
    >
      
      {/* Top Header Controls Bar */}
      <header className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between backdrop-blur-md bg-opacity-80" style={{ borderColor: themeStyle.border }}>
        <button
          onClick={() => {
            window.speechSynthesis.cancel();
            navigate(-1);
          }}
          className="flex items-center gap-2 text-xs font-semibold hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Reader</span>
        </button>

        <div className="text-center">
          <span className="font-serif-title font-bold text-base block">{localBook.title}</span>
          <span className="text-[11px] opacity-70">{activeChapter.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Display */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs opacity-80 bg-black/5 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(secondsRead)}</span>
          </div>

          {/* TTS Button */}
          <button
            onClick={toggleTts}
            className={`p-2 rounded-full border transition-all ${
              isPlayingTts ? 'bg-red-500 text-white' : 'border-current opacity-80 hover:opacity-100'
            }`}
            title="Text-to-Speech"
          >
            {isPlayingTts ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full border border-current opacity-80 hover:opacity-100 transition-opacity"
            title="Display Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Notes & Highlights Toggle */}
          <button
            onClick={() => {
              setShowAnnotations(true);
              setShowAiDrawer(false);
              setShowStudy(false);
            }}
            className="relative p-2 rounded-full border border-current opacity-80 hover:opacity-100 transition-opacity"
            title="Notes & Highlights"
            aria-label="Open notes and highlights"
          >
            <Highlighter className="w-4 h-4" />
            {annotateCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#E0A96D] text-[var(--ink)] text-[9px] font-bold flex items-center justify-center">
                {annotateCount}
              </span>
            )}
          </button>

          {/* Study Companion Toggle */}
          <button
            onClick={() => {
              setShowStudy(true);
              setShowAiDrawer(false);
              setShowAnnotations(false);
            }}
            className="p-2 rounded-full border border-current opacity-80 hover:opacity-100 transition-opacity"
            title="Study this chapter"
            aria-label="Open study companion"
          >
            <GraduationCap className="w-4 h-4" />
          </button>

          {/* AI Drawer Toggle */}
          <button
            onClick={() => {
              setShowAiDrawer(!showAiDrawer);
              setShowStudy(false);
              setShowAnnotations(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E0A96D] text-[var(--ink)] text-xs font-bold shadow-warm-sm hover:scale-105 transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ask AI</span>
          </button>
        </div>
      </header>

      {/* Reader Display Settings Floating Drawer */}
      {showSettings && (
        <div className="fixed top-16 right-6 z-50 w-80 bg-[var(--ink)] text-[var(--bg-ivory)] rounded-3xl p-6 shadow-2xl border border-white/20 space-y-4">
          <h4 className="font-serif-title text-xl font-bold border-b border-white/10 pb-2">Reader Customization</h4>
          
          {/* Typography Selector */}
          <div>
            <label className="text-xs uppercase font-semibold text-[#A0A0A0] block mb-2">Typography</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Newsreader', 'Cormorant Garamond', 'Plus Jakarta Sans', 'Monospace'].map((f) => (
                <button
                  key={f}
                  onClick={() => setReaderSettings({ ...readerSettings, fontFamily: f as any })}
                  className={`py-2 px-2 rounded-xl text-center border transition-all ${
                    readerSettings.fontFamily === f ? 'bg-white text-[var(--ink)] font-bold' : 'border-white/20 text-white/70'
                  }`}
                >
                  {f.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div>
            <div className="flex justify-between text-xs text-[#A0A0A0] mb-1">
              <span>Font Size</span>
              <span>{readerSettings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="28"
              value={readerSettings.fontSize}
              onChange={(e) => setReaderSettings({ ...readerSettings, fontSize: Number(e.target.value) })}
              className="w-full accent-[#E0A96D]"
            />
          </div>

          {/* Theme Color Presets */}
          <div>
            <label className="text-xs uppercase font-semibold text-[#A0A0A0] block mb-2">Color Palette</label>
            <div className="flex gap-2">
              {[
                { id: 'ivory', bg: '#F8F6F1', border: '#E5E0D8' },
                { id: 'parchment', bg: '#F5EBE0', border: '#E0D4C5' },
                { id: 'sepia', bg: '#FAF0E6', border: '#E0D0C0' },
                { id: 'dark-velvet', bg: '#1D1D1D', border: '#333333' },
                { id: 'midnight', bg: '#0F111A', border: '#222533' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReaderSettings({ ...readerSettings, theme: t.id as any })}
                  style={{ backgroundColor: t.bg }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    readerSettings.theme === t.id ? 'scale-125 border-[#E0A96D]' : 'border-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Distraction-Free Book Text Canvas */}
      <main className="max-w-2xl mx-auto px-6 py-12 md:py-20 min-h-[70vh]">
        
        <h2 className="font-serif-title text-3xl md:text-4xl font-bold mb-8 text-center">
          {activeChapter.title}
        </h2>

        <article
          ref={articleRef}
          onMouseUp={handleArticleMouseUp}
          className="leading-relaxed font-reader space-y-6"
          style={{
            fontSize: `${readerSettings.fontSize}px`,
            lineHeight: readerSettings.lineHeight,
            fontFamily: readerSettings.fontFamily === 'Newsreader' ? 'Newsreader, serif' : readerSettings.fontFamily,
          }}
        >
          {activeChapter.content.split('\n\n').map((para, i) => renderParagraph(para, i))}
        </article>

      </main>

      {/* Chapter Navigation Footer */}
      <footer className="sticky bottom-0 z-40 border-t px-6 py-4 flex items-center justify-between backdrop-blur-md bg-opacity-80" style={{ borderColor: themeStyle.border }}>
        <button
          disabled={currentChapterIdx === 0}
          onClick={() => setCurrentChapterIdx((prev) => Math.max(0, prev - 1))}
          className="flex items-center gap-2 text-xs font-semibold disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Chapter</span>
        </button>

        <span className="text-xs opacity-70">
          Chapter {currentChapterIdx + 1} of {chapters.length}
        </span>

        <button
          disabled={currentChapterIdx === chapters.length - 1}
          onClick={() => setCurrentChapterIdx((prev) => Math.min(chapters.length - 1, prev + 1))}
          className="flex items-center gap-2 text-xs font-semibold disabled:opacity-30"
        >
          <span>Next Chapter</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* AI Assistant Side Drawer */}
      {showAiDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[var(--ink)] text-[var(--bg-ivory)] p-6 shadow-2xl border-l border-white/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Reading Assistant</span>
              </div>
              <button onClick={() => setShowAiDrawer(false)} className="text-xs text-[#A0A0A0] hover:text-white">Close</button>
            </div>

            <p className="text-xs text-[#A0A0A0] mb-4">
              Ask Gemini about chapter themes, historical context, or request a quick 3-bullet summary.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ask about this chapter..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D]"
              />
              <button
                onClick={handleAskAi}
                disabled={loadingAi || !aiPrompt.trim()}
                className="w-full py-2.5 rounded-2xl bg-[#E0A96D] text-[var(--ink)] font-bold text-xs hover:bg-[#D49A5B] transition-all disabled:opacity-50"
              >
                {loadingAi ? 'Synthesizing...' : 'Ask AI Companion'}
              </button>
            </div>

            {aiResponse && (
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#E0E1DD] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {aiResponse}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating annotation toolbar above the selection */}
      {selToolbar && (
        <SelectionToolbar
          x={selToolbar.x}
          y={selToolbar.y}
          quote={selToolbar.text}
          onHighlight={applyHighlight}
          onNote={openNoteComposer}
          onClose={() => setSelToolbar(null)}
        />
      )}

      {/* Note composer modal */}
      {composer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setComposer(null);
          }}
        >
          <div
            className="w-full max-w-lg bg-[var(--ink)] text-[var(--bg-ivory)] rounded-3xl p-6 shadow-2xl border border-white/20 space-y-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-bold uppercase tracking-wider">
                <StickyNote className="w-4 h-4" />
                <span>Add a note</span>
              </div>
              <button onClick={() => setComposer(null)} aria-label="Close composer" className="text-xs text-[#A0A0A0] hover:text-white">
                Close
              </button>
            </div>
            <textarea
              autoFocus
              value={composer.text}
              onChange={(e) => setComposer({ text: e.target.value })}
              placeholder="Your note on this passage…"
              rows={5}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setComposer(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-white/20 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={!composer.text.trim()}
                className="px-4 py-2 rounded-full bg-[#E0A96D] text-[var(--ink)] text-xs font-bold hover:bg-[#D49A5B] transition-all disabled:opacity-50"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transient error toast for annotation actions */}
      {annotateErr && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold shadow-lg">
          {annotateErr}
        </div>
      )}

      {/* Notes & Highlights side panel */}
      <AnnotationsPanel
        open={showAnnotations}
        onClose={() => setShowAnnotations(false)}
        pending={entryLoading}
        hasEntry={!!entryId}
        onAddToLibrary={addBookToLibrary}
        addingToLibrary={addingToLibrary}
        loading={annotations.loading}
        notes={annotations.notes}
        highlights={annotations.highlights}
        onDeleteNote={(id) => {
          annotations.removeNote(id).catch(() => setAnnotateErr('Could not delete that note.'));
        }}
        onDeleteHighlight={(id) => {
          annotations.removeHighlight(id).catch(() => setAnnotateErr('Could not delete that highlight.'));
        }}
      />

      {/* Study Companion drawer — keyed by book so chat & quiz progress reset on navigation */}
      <StudyPanel
        key={localBook.id}
        open={showStudy}
        onClose={() => setShowStudy(false)}
        bookId={localBook.id}
        entryId={entryId}
        addingToLibrary={addingToLibrary}
        onAddToLibrary={addBookToLibrary}
        chapterNum={chapterNum}
        chapterTitle={activeChapter.title}
        chapterText={activeChapter.content}
      />

    </div>
  );
};
