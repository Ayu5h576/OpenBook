/**
 * Author insight prompts — the "why you might like them" card.
 *
 * Everything here is pure so the rules are testable without a model or a
 * database. Two of them matter more than the prose:
 *
 *   - The prompt is built only from facts we hold (the reader's own history and
 *     the bibliography we fetched). The model is asked to *connect* those facts,
 *     never to supply new ones.
 *   - Anything it names is checked back against those facts before it reaches
 *     the page. A recommendation to "start with <book that does not exist>" is
 *     the single most likely way this feature misleads someone, so a title the
 *     model invented is dropped rather than shown.
 */
import type { AuthorInsight, AuthorInsightBody } from '../../types/ai';

export type { AuthorInsight, AuthorInsightBody };

/** The shape of an author profile this module needs — structural on purpose, so
 *  the tests can build one without touching Prisma or the network. */
export interface InsightProfile {
  author: {
    name: string;
    bio?: string;
    topWork?: string;
    workCount?: number;
    subjects?: string[];
  };
  history: {
    booksInLibrary: number;
    booksCompleted: number;
    booksReading: number;
    pagesRead: number;
    favorites: number;
    averageRating: number | null;
    ratedCount: number;
  };
  booksInLibrary: { title: string; status?: string; myRating?: number }[];
  moreByAuthor: { title: string; publishedDate?: string }[];
  relatedAuthors: { name: string; sharedGenres?: string[] }[];
  genres: string[];
}

const MAX_CONNECTIONS = 4;
const MAX_BIO_CHARS = 700;
const MAX_TITLES = 20;

export const authorInsightSystemInstruction =
  "You introduce authors to a reader using only the facts supplied. Never invent " +
  'biography, awards, publication dates, or book titles. Recommend only titles from ' +
  'the provided lists. If the reader has no history with this author, say so plainly ' +
  'and connect through shared genres instead. Be concise and concrete.';

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Every title we know this author actually wrote. */
export function candidateTitles(profile: InsightProfile): string[] {
  return [
    ...profile.booksInLibrary.map((b) => b.title),
    ...profile.moreByAuthor.map((b) => b.title),
  ].filter((t) => t && t.trim().length > 0);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

/**
 * The reader's relationship with this author, as plain sentences.
 *
 * Shared by the prompt (as grounding) and the offline fallback (as the answer),
 * so what the model is told and what we say without it can never disagree.
 */
export function describeReaderHistory(profile: InsightProfile): string {
  const { history } = profile;
  const name = profile.author.name;

  if (history.booksInLibrary === 0) {
    return `The reader has none of ${name}'s books in their library.`;
  }

  const parts = [`The reader has ${plural(history.booksInLibrary, 'book')} by ${name}`];
  if (history.booksCompleted > 0) parts.push(`${history.booksCompleted} finished`);
  if (history.booksReading > 0) parts.push(`${history.booksReading} in progress`);
  if (history.favorites > 0) parts.push(`${plural(history.favorites, 'favourite')}`);
  if (history.pagesRead > 0) parts.push(`${plural(history.pagesRead, 'page')} read`);
  if (history.averageRating !== null) {
    parts.push(`rated ${history.averageRating}/5 across ${plural(history.ratedCount, 'book')}`);
  }

  return `${parts.join(', ')}.`;
}

export function buildAuthorInsightPrompt(profile: InsightProfile): string {
  const { author } = profile;
  const owned = profile.booksInLibrary.slice(0, MAX_TITLES);
  const more = profile.moreByAuthor.slice(0, MAX_TITLES);

  const sections: string[] = [
    `AUTHOR: ${author.name}`,
  ];

  if (author.bio) sections.push(`ENCYCLOPEDIA SUMMARY:\n${truncate(author.bio, MAX_BIO_CHARS)}`);
  if (author.topWork) sections.push(`BEST KNOWN FOR: ${author.topWork}`);
  if (profile.genres.length) sections.push(`GENRES: ${profile.genres.slice(0, 8).join(', ')}`);

  sections.push(`READER HISTORY: ${describeReaderHistory(profile)}`);

  if (owned.length) {
    sections.push(
      `IN THE READER'S LIBRARY:\n${owned
        .map((b) => {
          const bits = [b.status?.toLowerCase()].filter(Boolean);
          if (typeof b.myRating === 'number') bits.push(`rated ${b.myRating}/5`);
          return `- ${b.title}${bits.length ? ` (${bits.join(', ')})` : ''}`;
        })
        .join('\n')}`
    );
  }

  if (more.length) {
    sections.push(
      `NOT YET IN THEIR LIBRARY:\n${more
        .map((b) => `- ${b.title}${b.publishedDate ? ` (${b.publishedDate})` : ''}`)
        .join('\n')}`
    );
  }

  if (profile.relatedAuthors.length) {
    sections.push(
      `OTHER AUTHORS ON THEIR SHELF: ${profile.relatedAuthors
        .slice(0, 6)
        .map((a) => a.name)
        .join(', ')}`
    );
  }

  sections.push(
    [
      'TASK: Write a short introduction to this author for this specific reader.',
      'Respond with JSON only:',
      '{',
      '  "insight": "2-3 sentences on what reading this author is like and why it may suit this reader",',
      '  "connections": ["specific tie to a book or author already on their shelf", "..."],',
      '  "startWith": { "title": "one title from the lists above", "why": "one sentence" }',
      '}',
      'Rules: use only the facts above. Do not invent titles, dates, or biography.',
      'If nothing above supports a connection, return an empty connections array.',
      'Omit startWith entirely if no listed title is a sensible entry point.',
    ].join('\n')
  );

  return sections.join('\n\n');
}

/**
 * What the card says when the model is unavailable.
 *
 * Built entirely from counts we already computed, so it is always true — it just
 * says less. The reader gets their own history back rather than an error.
 */
export function buildAuthorInsightFallback(profile: InsightProfile): AuthorInsight {
  const { author, history } = profile;
  const sentences: string[] = [];

  if (history.booksInLibrary === 0) {
    sentences.push(`${author.name} is new to your library.`);
    if (profile.genres.length) {
      sentences.push(`They write in ${profile.genres.slice(0, 3).join(', ')}.`);
    }
  } else {
    // Already covers finished/in-progress/favourites/pages, so it stands alone.
    sentences.push(describeReaderHistory(profile));
  }

  if (author.workCount) {
    sentences.push(`Open Library lists ${plural(author.workCount, 'work')} under their name.`);
  }

  const connections = profile.relatedAuthors.slice(0, MAX_CONNECTIONS).map((related) => {
    const shared = related.sharedGenres?.slice(0, 2).join(' and ');
    return shared
      ? `${related.name} is also on your shelf in ${shared}.`
      : `${related.name} is also on your shelf.`;
  });

  const next = profile.moreByAuthor[0];

  return {
    author: author.name,
    insight: sentences.join(' '),
    connections,
    startWith: next
      ? { title: next.title, why: 'Next on their bibliography that you do not own yet.' }
      : undefined,
  };
}

/**
 * Normalize the model's JSON, discarding anything unsupported by our facts.
 *
 * A `startWith` naming a title that is not in the bibliography is dropped
 * outright: the model has either hallucinated a book or picked one we cannot
 * link to, and both render as a dead recommendation.
 */
export function formatAuthorInsight(
  body: AuthorInsightBody,
  profile: InsightProfile
): AuthorInsight {
  const fallback = buildAuthorInsightFallback(profile);

  const insight = body.insight?.trim();
  const connections = (body.connections ?? [])
    .filter((c): c is string => typeof c === 'string')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CONNECTIONS);

  const known = new Map(candidateTitles(profile).map((t) => [t.trim().toLowerCase(), t]));
  const proposed = body.startWith?.title?.trim().toLowerCase();
  const matched = proposed ? known.get(proposed) : undefined;

  return {
    author: profile.author.name,
    insight: insight || fallback.insight,
    connections: connections.length ? connections : fallback.connections,
    startWith: matched
      ? { title: matched, why: body.startWith?.why?.trim() || 'A good place to begin.' }
      : undefined,
  };
}
