/**
 * Study quiz interaction state.
 *
 * The reader walks one flashcard at a time through the AI-generated quiz: read a
 * question, reveal the answer, then judge it "Got it" or "Needs review". These
 * helpers keep that progression pure and DOM-free so it is unit-testable; the
 * Study panel just holds a `QuizState` in useState and calls a transition.
 *
 * The rules are deliberately strict so the UI can never miscount: a card can be
 * answered only while it is revealed, an answer can be given only before the
 * deck is exhausted, and revealing twice or answering while hidden is a no-op.
 */

export interface QuizItem {
  question: string;
  answer: string;
}

export interface QuizState {
  items: QuizItem[];
  /** Index of the card on screen; equals items.length once the deck is done. */
  index: number;
  /** Whether the answer to the active card is currently shown. */
  revealed: boolean;
  got: number;
  review: number;
}

export type QuizOutcome = 'got' | 'review';

export function initialQuizState(items: QuizItem[]): QuizState {
  return { items, index: 0, revealed: false, got: 0, review: 0 };
}

/** The card on screen, or undefined when the deck is exhausted or empty. */
export function activeCard(state: QuizState): QuizItem | undefined {
  return state.items[state.index];
}

export function isFinished(state: QuizState): boolean {
  return state.index >= state.items.length;
}

/** How many cards have been judged, out of the deck size. */
export function answeredCount(state: QuizState): number {
  return state.got + state.review;
}

/** Show the active card's answer. A no-op when already revealed or deck done. */
export function revealCard(state: QuizState): QuizState {
  if (state.revealed || isFinished(state)) return state;
  return { ...state, revealed: true };
}

/**
 * Judge the active card and advance. Only valid while a card is on screen and
 * its answer is revealed; otherwise the deck size and score would drift.
 */
export function answerCard(state: QuizState, outcome: QuizOutcome): QuizState {
  if (!state.revealed || isFinished(state)) return state;
  return {
    ...state,
    index: state.index + 1,
    revealed: false,
    got: outcome === 'got' ? state.got + 1 : state.got,
    review: outcome === 'review' ? state.review + 1 : state.review,
  };
}

/** Start the same deck over, keeping its questions but clearing progress. */
export function resetQuiz(state: QuizState): QuizState {
  return { items: state.items, index: 0, revealed: false, got: 0, review: 0 };
}
