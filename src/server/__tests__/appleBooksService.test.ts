/**
 * appleBooksService.matchAppleResult — the guard that decides whether an iTunes
 * search hit is trustworthy enough to quote a price from.
 *
 * This is the whole safety story for Apple pricing: the raw search happily
 * returns study guides, sequels, and graphic-novel adaptations, and the ISBN
 * lookup endpoint returns outright wrong books. Nothing downstream re-checks the
 * match, so these cases are the contract.
 */
import { describe, it, expect } from 'vitest';
import { matchAppleResult } from '../services/appleBooksService';

const ebook = (trackName: string, artistName: string, price = 9.99) => ({
  trackName,
  artistName,
  price,
  currency: 'USD',
  trackViewUrl: `https://books.apple.com/us/book/${encodeURIComponent(trackName)}`,
  kind: 'ebook' as const,
});

describe('matchAppleResult', () => {
  it('accepts an exact title + author match', () => {
    const hit = matchAppleResult(
      { title: 'The Alchemist', authors: ['Paulo Coelho'] },
      [ebook('The Alchemist', 'Paulo Coelho', 14.99)]
    );
    expect(hit?.price).toBe(14.99);
  });

  it('prefers the exact edition over a subtitled adaptation listed first', () => {
    const hit = matchAppleResult({ title: 'The Alchemist', authors: ['Paulo Coelho'] }, [
      ebook('The Alchemist: A Graphic Novel', 'Paulo Coelho', 14.99),
      ebook('The Alchemist', 'Paulo Coelho', 12.99),
    ]);
    expect(hit?.trackName).toBe('The Alchemist');
    expect(hit?.price).toBe(12.99);
  });

  it('accepts a different subtitle/edition of the same title', () => {
    const hit = matchAppleResult({ title: 'The Alchemist', authors: ['Paulo Coelho'] }, [
      ebook('The Alchemist - 10th Anniversary Edition', 'Paulo Coelho', 9.99),
    ]);
    expect(hit?.price).toBe(9.99);
  });

  it('rejects a sequel that merely starts with the title', () => {
    // "Dune Messiah" is not "Dune"; a prefix match would wrongly price it.
    const hit = matchAppleResult({ title: 'Dune', authors: ['Frank Herbert'] }, [
      ebook('Dune Messiah', 'Frank Herbert'),
    ]);
    expect(hit).toBeNull();
  });

  it('rejects a study guide about the book', () => {
    const hit = matchAppleResult(
      { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'] },
      [ebook("A Study Guide for Ursula K. Le Guin's \"The Left Hand of Darkness\"", 'The Gale Group')]
    );
    expect(hit).toBeNull();
  });

  it('matches the author even with a co-author appended by Apple', () => {
    const hit = matchAppleResult(
      { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'] },
      [ebook('The Left Hand of Darkness', 'Ursula K. Le Guin & Charlie Jane Anders')]
    );
    expect(hit).not.toBeNull();
  });

  it('rejects the right title by the wrong author', () => {
    const hit = matchAppleResult({ title: 'The Alchemist', authors: ['Paulo Coelho'] }, [
      ebook('The Alchemist', 'Ben Jonson'),
    ]);
    expect(hit).toBeNull();
  });

  it('ignores non-ebook kinds', () => {
    const hit = matchAppleResult({ title: 'Dune', authors: ['Frank Herbert'] }, [
      { ...ebook('Dune', 'Frank Herbert'), kind: 'audiobook' },
    ]);
    expect(hit).toBeNull();
  });

  it('ignores a result with no price', () => {
    const hit = matchAppleResult({ title: 'Dune', authors: ['Frank Herbert'] }, [
      { ...ebook('Dune', 'Frank Herbert'), price: undefined },
    ]);
    expect(hit).toBeNull();
  });

  it('matches through diacritics on either side', () => {
    const hit = matchAppleResult({ title: 'Beloved', authors: ['Gabriel García Márquez'] }, [
      ebook('Beloved', 'Gabriel Garcia Marquez'),
    ]);
    expect(hit).not.toBeNull();
  });

  it('returns null on an empty result set', () => {
    expect(matchAppleResult({ title: 'Dune', authors: ['Frank Herbert'] }, [])).toBeNull();
  });
});
