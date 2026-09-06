/**
 * Study Companion — pure prompt, fallback, and formatting helpers.
 *
 * Everything here is free of DB and provider access so unit tests can exercise
 * it directly. The controller only wires these to aiDataService / aiService.
 */
import type { StudyPack, StudyPackBody, StudyQuizItem, StudyTerm } from '../../types/ai';

/** Ceiling on the chapter text placed in a study-pack prompt (characters). */
export const STUDY_CHAPTER_TEXT_MAX = 9000;

export const studyPackSystemInstruction =
  'You are a careful study coach. Generate study material ONLY from the chapter text you are given. Do not invent details, characters, or terms that are not present in that text. Return valid JSON only.';

/** Minimal book shape the prompt builders rely on (see aiDataService). */
export interface StudyBookContext {
  title: string;
  authors?: string[] | string | null;
  description?: string | null;
}

function authorList(book: StudyBookContext): string {
  const a = book.authors;
  if (Array.isArray(a) && a.length) return a.join(', ');
  if (typeof a === 'string' && a.trim()) return a.trim();
  return 'Unknown author';
}

/** Compose the study-pack prompt. Deterministic — pure string building. */
export function buildStudyPackPrompt(
  book: StudyBookContext,
  chapterNum: number,
  chapterText: string,
  chapterTitle?: string
): string {
  const excerpt = (chapterText || '').trim().slice(0, STUDY_CHAPTER_TEXT_MAX);
  const lines = [
    `Book: "${book.title}" by ${authorList(book)}`,
    chapterTitle ? `Chapter: ${chapterTitle} (chapter ${chapterNum})` : `Chapter: ${chapterNum}`,
    '',
    'CHAPTER TEXT (study ONLY this):',
    excerpt,
    '',
    'Create a compact study pack for this chapter in exactly this JSON shape:',
    JSON.stringify(
      {
        summary: '3-6 sentence summary of what this chapter says',
        keyIdeas: ['3-6 concise takeaways, each a complete sentence'],
        terms: [{ term: 'key word or phrase from the chapter', definition: 'simple 1-2 sentence definition' }],
        quiz: [{ question: 'a real question answerable from the chapter text', answer: 'the correct answer' }],
      },
      null,
      2
    ),
    '',
    'Rules: base everything on the CHAPTER TEXT above, not the book description. Use up to 6 terms and up to 4 quiz questions. Keep definitions plain enough for a first-time reader.',
  ];
  return lines.join('\n');
}

/** Deterministic pack used when Gemini is unavailable or the request fails. */
export function buildStudyPackFallback(book: StudyBookContext, chapterNum: number): StudyPackBody {
  return {
    summary: `Study tools are offline right now, so OpenBook couldn't draft a pack for chapter ${chapterNum} of "${book.title}". Try again when the AI service is available.`,
    keyIdeas: [],
    terms: [],
    quiz: [],
  };
}

function cleanString(value: unknown, maxLength = 1200): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanStringList(value: unknown, maxItems = 8, itemLength = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, itemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanTerms(value: unknown, maxItems = 6): StudyTerm[] {
  if (!Array.isArray(value)) return [];
  const terms: StudyTerm[] = [];
  for (const raw of value) {
    if (terms.length >= maxItems) break;
    if (!raw || typeof raw !== 'object') continue;
    const term = cleanString((raw as any).term, 80);
    const definition = cleanString((raw as any).definition, 400);
    if (term && definition) terms.push({ term, definition });
  }
  return terms;
}

function cleanQuiz(value: unknown, maxItems = 4): StudyQuizItem[] {
  if (!Array.isArray(value)) return [];
  const quiz: StudyQuizItem[] = [];
  for (const raw of value) {
    if (quiz.length >= maxItems) break;
    if (!raw || typeof raw !== 'object') continue;
    const question = cleanString((raw as any).question, 300);
    const answer = cleanString((raw as any).answer, 500);
    if (question && answer) quiz.push({ question, answer });
  }
  return quiz;
}

/**
 * Turn whatever Gemini (or the fallback) returned into a well-formed StudyPack.
 * Model JSON is unreliable — every field is coerced, trimmed, and capped.
 */
export function formatStudyPack(raw: unknown, bookId: string, chapterNum: number): StudyPack {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const keyIdeas = cleanStringList(body.keyIdeas, 8, 300);
  const summary =
    cleanString(body.summary, 1200) || (keyIdeas[0] ? keyIdeas[0] : `No summary was generated for chapter ${chapterNum}.`);
  return {
    bookId,
    chapterNum,
    summary,
    keyIdeas,
    terms: cleanTerms(body.terms, 6),
    quiz: cleanQuiz(body.quiz, 4),
  };
}

// ─── Annotation-grounded study chat (#14) ─────────────────────────────────────

const MAX_PASSAGES = 20;
const MAX_PASSAGE_CHARS = 400;

/** Rows the reader has stored for a book (BookHighlight / BookNote shapes). */
export interface AnnotationRow {
  text?: string | null;
  chapter?: number | null;
}

/** Collapse internal whitespace so verbatim model quotes can be matched. */
export function normalizePassage(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The reader's highlights + notes, deduped and normalized, optionally narrowed
 * to one chapter. Deterministic ordering: highlights first, then notes.
 */
export function collectPassages(
  highlights: AnnotationRow[],
  notes: AnnotationRow[],
  chapterNum?: number
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const consider = (text: string | null | undefined, chapter: number | null | undefined) => {
    if (!text) return;
    if (chapterNum !== undefined && chapter !== chapterNum) return; // null chapter is not "this chapter"
    const t = normalizePassage(text).slice(0, MAX_PASSAGE_CHARS);
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  for (const h of highlights) consider(h.text, h.chapter);
  for (const n of notes) consider(n.text, n.chapter);
  return out.slice(0, MAX_PASSAGES);
}

/** Numbered, quoted listing of passages for inclusion in a chat prompt. */
export function buildAnnotationsPromptBlock(passages: string[]): string {
  if (passages.length === 0) return 'The reader has no saved highlights or notes for this chapter.';
  return passages.map((p, i) => `${i + 1}. "${p}"`).join('\n');
}

/** Full prompt for the annotation-grounded chat path. Pure string building. */
export function buildAnnotatedChatPrompt(opts: {
  message: string;
  book?: { title: string; authors?: string[] | string | null } | null;
  context?: string;
  history?: Array<{ role: string; content: string }>;
  passages: string[];
}): string {
  const { message, book, context, history, passages } = opts;
  const lines: string[] = [];
  if (book) lines.push(`Book: "${book.title}" by ${authorList(book)}`);
  if (context && context.trim()) {
    lines.push('', 'CHAPTER CONTEXT (excerpt from the chapter):', context.trim().slice(0, 4000));
  }
  lines.push('', "THE READER'S SAVED HIGHLIGHTS AND NOTES FOR THIS CHAPTER:", buildAnnotationsPromptBlock(passages));
  if (history && history.length > 0) {
    lines.push('', 'RECENT CONVERSATION:');
    lines.push(...history.slice(-4).map((m) => `${m.role}: ${m.content}`));
  }
  lines.push(
    '',
    'Answer the reader\'s question about this chapter. Ground your answer in the saved passages above where they are relevant, and never invent passages they did not save. When you draw on a specific saved passage, quote it verbatim on its own line prefixed with "SOURCE: ".'
  );
  lines.push('', `READER'S QUESTION: ${message}`);
  return lines.join('\n');
}

function stripWrappingQuotes(s: string): string {
  const stripped = s.replace(/^[“"\']+/, '').replace(/[”"\']+$/, '');
  return normalizePassage(stripped);
}

/**
 * Split a model answer into its visible text and the saved passages it cited.
 *
 * The model marks cited passages with `SOURCE: "…"` lines; those lines are
 * dropped from the displayed answer and the matching saved passage texts are
 * returned in the order the reader saved them.
 */
export function extractCitations(modelText: string, passages: string[]): { response: string; citations: string[] } {
  const response = modelText
    .split('\n')
    .filter((line) => !/^SOURCE:/i.test(line.trim()))
    .join('\n')
    .trim();

  const citedNormalized = new Set<string>();
  for (const line of modelText.split('\n')) {
    const trimmed = line.trim();
    if (!/^SOURCE:/i.test(trimmed)) continue;
    const quoted = stripWrappingQuotes(trimmed.replace(/^SOURCE:\s*/i, ''));
    if (!quoted) continue;
    for (const passage of passages) {
      const normalizedPassage = normalizePassage(passage);
      if (quoted.includes(normalizedPassage) || (quoted.length >= 12 && normalizedPassage.includes(quoted))) {
        citedNormalized.add(normalizedPassage);
      }
    }
  }

  const citations = passages.filter((p) => citedNormalized.has(normalizePassage(p)));
  return { response, citations };
}

