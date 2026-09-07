/**
 * StudyPanel — the in-reader Study Companion drawer.
 *
 * Three tabs over one chapter:
 *   Review — an AI study pack (summary, key ideas, glossary) drafted from the
 *            chapter text actually on screen. The reader synthesizes chapters,
 *            so the text is sent from here; the server stores no chapter store.
 *   Quiz   — self-check flashcards over the pack's quiz items.
 *   Ask    — Q&A grounded in the reader's own saved highlights/notes for this
 *            chapter (POST /study-chat), with the cited passages surfaced under
 *            each answer.
 *
 * State notes:
 *   - The pack lives in the React Query cache under ['ai','study-pack',book,chapter]
 *     so flipping chapters or reopening the drawer is instant after the first
 *     generation (the server caches the same request per user).
 *   - The quiz run is its own component keyed by a deck signature: when a new
 *     pack arrives its progress simply remounts — no effect to keep in sync.
 *   - The chat keeps one thread per book by echoing back the server's
 *     conversationId; it lives for the panel's lifetime (per book, because the
 *     reader mounts this panel with key={bookId}).
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { AIApiService, StudyQuizItem } from '../services/api';
import {
  activeCard,
  answerCard,
  answeredCount,
  initialQuizState,
  isFinished,
  resetQuiz,
  revealCard,
} from '../utils/studyQuiz';

/** Mirrors studyPackSchema.chapterText ceiling; the reader's text is sliced here. */
const CHAPTER_TEXT_MAX = 12000;
/** The chapter excerpt attached to a study-chat question (server slices again). */
const CHAPTER_CONTEXT_MAX = 4000;

type StudyTab = 'review' | 'quiz' | 'ask';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
}

const TABS: { key: StudyTab; label: string; icon: LucideIcon }[] = [
  { key: 'review', label: 'Review', icon: BookOpen },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle },
  { key: 'ask', label: 'Ask', icon: MessageSquare },
];

const SUGGESTIONS = [
  'Summarize what I highlighted here',
  'How do my notes connect to the chapter main idea?',
  'Ask me a question this chapter should let me answer',
];

/** Signature of a deck, used to remount the quiz when the pack's questions change. */
function deckSignature(quiz: StudyQuizItem[]): string {
  return JSON.stringify(quiz);
}

const QuizRun: React.FC<{ quiz: StudyQuizItem[] }> = ({ quiz }) => {
  const [state, setState] = useState(() => initialQuizState(quiz));

  if (isFinished(state)) {
    const again = state.review;
    return (
      <div className="text-center py-10 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#E0A96D]/15 border border-[#E0A96D]/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-[#E0A96D]" />
        </div>
        <p className="font-serif-title text-2xl font-bold">
          {state.got} of {quiz.length}
        </p>
        <p className="text-xs text-white/60 leading-relaxed">
          {again > 0
            ? `${again} card${again === 1 ? '' : 's'} marked for review — run the deck again to reinforce them.`
            : 'All answers mastered. Nicely done.'}
        </p>
        <button
          onClick={() => setState((s) => resetQuiz(s))}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restart quiz
        </button>
      </div>
    );
  }

  const card = activeCard(state)!;
  return (
    <div className="space-y-4">
      <div className="text-[11px] text-white/40">
        Card {state.index + 1} of {quiz.length} · {answeredCount(state)} answered
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="font-serif-title text-xl leading-snug text-white/95">{card.question}</p>
        {state.revealed && (
          <div className="mt-5 rounded-2xl bg-[#E0A96D]/10 border border-[#E0A96D]/25 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-[#E0A96D] mb-1">Answer</div>
            <p className="text-sm leading-relaxed text-white/90">{card.answer}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {state.revealed ? (
          <>
            <button
              onClick={() => setState((s) => answerCard(s, 'review'))}
              className="flex-1 rounded-2xl border border-white/20 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
            >
              Needs review
            </button>
            <button
              onClick={() => setState((s) => answerCard(s, 'got'))}
              className="flex-1 rounded-2xl bg-[#E0A96D] text-[var(--ink)] py-2.5 text-xs font-bold hover:bg-[#D49A5B] transition-all"
            >
              Got it
            </button>
          </>
        ) : (
          <button
            onClick={() => setState((s) => revealCard(s))}
            className="w-full rounded-2xl border border-[#E0A96D]/50 text-[#E0A96D] py-2.5 text-xs font-bold hover:bg-[#E0A96D]/10 transition-colors"
          >
            Reveal answer
          </button>
        )}
      </div>
    </div>
  );
};

export interface StudyPanelProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  /** The reader's LibraryEntry for this book, when one exists (grounding needs it). */
  entryId: string | null;
  addingToLibrary?: boolean;
  onAddToLibrary?: () => void;
  chapterNum: number;
  chapterTitle: string;
  /** Raw chapter prose; the client supplies it because the server stores no chapters. */
  chapterText: string;
}

export const StudyPanel: React.FC<StudyPanelProps> = ({
  open,
  onClose,
  bookId,
  entryId,
  addingToLibrary,
  onAddToLibrary,
  chapterNum,
  chapterTitle,
  chapterText,
}) => {
  const [tab, setTab] = useState<StudyTab>('review');

  const packQuery = useQuery({
    queryKey: ['ai', 'study-pack', bookId, chapterNum],
    enabled: open && !!bookId,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const res = await AIApiService.getStudyPack(
        bookId,
        chapterNum,
        chapterText.slice(0, CHAPTER_TEXT_MAX),
        chapterTitle
      );
      if (res.error || !res.data) throw new Error(res.error || 'Could not draft the study pack.');
      return res.data;
    },
  });
  const pack = packQuery.data?.pack;

  // Grounded chat state — one thread per book, kept alive while the panel is open.
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const sendAsk = async () => {
    const text = draft.trim();
    if (!text || asking || !entryId) return;
    setTurns((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setAsking(true);
    setChatErr(null);
    try {
      const res = await AIApiService.studyChat({
        message: text,
        bookId,
        entryId,
        chapterNum,
        context: `Chapter: ${chapterTitle}\nReader excerpt: ${chapterText.slice(0, CHAPTER_CONTEXT_MAX)}`,
        conversationId: threadId,
      });
      if (res.error || !res.data) throw new Error(res.error || 'Could not reach the study assistant.');
      const data = res.data;
      setThreadId(data.conversationId);
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', text: data.response, citations: data.citations },
      ]);
    } catch (err) {
      setChatErr(err instanceof Error ? err.message : 'Could not reach the study assistant.');
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setAsking(false);
    }
  };

  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[var(--ink)] text-[var(--bg-ivory)] shadow-2xl border-l border-white/20 flex flex-col"
      role="dialog"
      aria-label="Study companion"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#E0A96D]">
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Study Companion</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close study panel"
            className="p-1.5 rounded-full text-[#A0A0A0] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-white/40">Chapter · {chapterTitle}</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-white/10">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                active
                  ? 'text-[#E0A96D] shadow-[inset_0_-2px_0_#E0A96D]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab bodies */}
      {tab === 'review' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
          {packQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#E0A96D]" />
              <p className="text-xs text-white/60">Drafting a study pack from this chapter…</p>
            </div>
          ) : packQuery.isError || !pack ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                {packQuery.error instanceof Error
                  ? packQuery.error.message
                  : 'No study pack available right now.'}
              </p>
              <button
                onClick={() => packQuery.refetch()}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {pack.summary && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Summary</h4>
                  <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap">{pack.summary}</p>
                </section>
              )}

              {pack.keyIdeas.length > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Key ideas</h4>
                  <ul className="space-y-2">
                    {pack.keyIdeas.map((idea, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/85">
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#E0A96D]" />
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {pack.terms.length > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Glossary</h4>
                  <dl className="space-y-2">
                    {pack.terms.map((t, i) => (
                      <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <dt className="text-sm font-bold text-[#E0A96D]">{t.term}</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-white/75">{t.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {pack.quiz.length > 0 && (
                <button
                  onClick={() => setTab('quiz')}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-[#E0A96D] text-[var(--ink)] py-2.5 text-xs font-bold hover:bg-[#D49A5B] transition-all"
                >
                  Start the quiz ({pack.quiz.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {packQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#E0A96D]" />
              <p className="text-xs text-white/60">Drafting your quiz…</p>
            </div>
          ) : !pack || pack.quiz.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <HelpCircle className="w-6 h-6 mx-auto text-white/30" />
              <p className="text-xs text-white/60 leading-relaxed">
                {packQuery.isError
                  ? 'The study pack could not be loaded.'
                  : 'This pack did not include any quiz questions.'}
              </p>
              <button
                onClick={() => setTab('review')}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Back to review
              </button>
            </div>
          ) : (
            <QuizRun key={deckSignature(pack.quiz)} quiz={pack.quiz} />
          )}
        </div>
      )}

      {tab === 'ask' && !entryId && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-[#E0A96D]" />
            <p className="text-xs leading-relaxed text-white/70">
              Answers here are grounded in <span className="text-white/95">your own</span> highlights and
              notes. Add this book to your library, save a few passages as you read, then come back to ask
              about what you marked.
            </p>
            {onAddToLibrary && (
              <button
                onClick={onAddToLibrary}
                disabled={addingToLibrary}
                className="rounded-full bg-[#E0A96D] text-[var(--ink)] px-4 py-2 text-xs font-bold hover:bg-[#D49A5B] transition-all disabled:opacity-50"
              >
                {addingToLibrary ? 'Adding…' : 'Add this book to my library'}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'ask' && entryId && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4">
            {turns.length === 0 ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs leading-relaxed text-white/60">
                  Ask about <span className="text-white/90">{chapterTitle}</span> and the answer will draw on
                  the passages you highlighted or noted here.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setDraft(q)}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 hover:border-[#E0A96D]/60 hover:text-[#E0A96D] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((t, i) =>
                t.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#E0A96D] text-[var(--ink)] px-4 py-2.5">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-sm leading-relaxed text-[#E0E1DD] whitespace-pre-wrap">{t.text}</p>
                      {t.citations && t.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="text-[10px] uppercase tracking-widest text-white/40">
                            Drew on your notes
                          </div>
                          {t.citations.map((c, ci) => (
                            <div
                              key={ci}
                              className="rounded-lg border-l-2 border-[#E0A96D] bg-white/5 px-3 py-2 text-xs text-white/70"
                            >
                              “{c}”
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )
            )}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E0A96D]" />
                  <span className="text-xs text-white/50">Reading your notes…</span>
                </div>
              </div>
            )}
          </div>

          {chatErr && <p className="px-5 pb-2 text-[11px] text-red-300">{chatErr}</p>}

          <form
            className="border-t border-white/10 px-4 py-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendAsk();
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask about ${chapterTitle}…`}
              disabled={asking}
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={asking || !draft.trim()}
              aria-label="Send question"
              className="shrink-0 p-2.5 rounded-full bg-[#E0A96D] text-[var(--ink)] hover:bg-[#D49A5B] transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
