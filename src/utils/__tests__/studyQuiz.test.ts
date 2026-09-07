import { describe, expect, it } from 'vitest';
import {
  activeCard,
  answerCard,
  answeredCount,
  initialQuizState,
  isFinished,
  resetQuiz,
  revealCard,
} from '../studyQuiz';
import type { QuizItem } from '../studyQuiz';

const deck: QuizItem[] = [
  { question: 'Who is the protagonist?', answer: 'Kvothe' },
  { question: 'What is a "tal"?', answer: 'A unit of currency' },
];

describe('initialQuizState', () => {
  it('starts at the first card with nothing revealed or scored', () => {
    const s = initialQuizState(deck);
    expect(s.index).toBe(0);
    expect(s.revealed).toBe(false);
    expect(s.got).toBe(0);
    expect(s.review).toBe(0);
    expect(activeCard(s)).toEqual(deck[0]);
  });
});

describe('revealCard', () => {
  it('shows the active card answer', () => {
    const s = revealCard(initialQuizState(deck));
    expect(s.revealed).toBe(true);
    expect(activeCard(s)).toEqual(deck[0]);
  });

  it('is a no-op once already revealed', () => {
    const once = revealCard(initialQuizState(deck));
    expect(revealCard(once)).toBe(once);
  });

  it('is a no-op on an empty deck', () => {
    const empty = initialQuizState([]);
    expect(isFinished(empty)).toBe(true);
    expect(revealCard(empty)).toBe(empty);
  });
});

describe('answerCard', () => {
  it('scores got, advances to the next card, and hides the answer', () => {
    let s = revealCard(initialQuizState(deck));
    s = answerCard(s, 'got');
    expect(s.got).toBe(1);
    expect(s.review).toBe(0);
    expect(s.index).toBe(1);
    expect(s.revealed).toBe(false);
    expect(activeCard(s)).toEqual(deck[1]);
  });

  it('scores review separately', () => {
    let s = revealCard(initialQuizState(deck));
    s = answerCard(s, 'review');
    expect(s.review).toBe(1);
    expect(s.got).toBe(0);
  });

  it('refuses to answer while the answer is hidden', () => {
    const s = answerCard(initialQuizState(deck), 'got');
    expect(s).toEqual(initialQuizState(deck));
  });

  it('refuses to answer past the end of the deck', () => {
    let s = revealCard(initialQuizState(deck));
    s = answerCard(s, 'got');
    s = revealCard(s);
    s = answerCard(s, 'review');
    expect(isFinished(s)).toBe(true);
    expect(s.got).toBe(1);
    expect(s.review).toBe(1);
    expect(answerCard(revealCard(s), 'got')).toBe(s);
  });
});

describe('progress', () => {
  it('counts judged cards out of the deck', () => {
    let s = initialQuizState(deck);
    expect(answeredCount(s)).toBe(0);
    s = answerCard(revealCard(s), 'got');
    expect(answeredCount(s)).toBe(1);
    s = answerCard(revealCard(s), 'review');
    expect(answeredCount(s)).toBe(2);
    expect(isFinished(s)).toBe(true);
    expect(activeCard(s)).toBeUndefined();
  });
});

describe('resetQuiz', () => {
  it('clears progress but keeps the same deck', () => {
    let s = answerCard(revealCard(initialQuizState(deck)), 'got');
    s = resetQuiz(s);
    expect(s.items).toEqual(deck);
    expect(s.index).toBe(0);
    expect(s.got).toBe(0);
    expect(s.review).toBe(0);
    expect(s.revealed).toBe(false);
  });
});
