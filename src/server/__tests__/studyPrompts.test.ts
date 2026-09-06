import { describe, expect, it } from 'vitest';
import {
  buildAnnotatedChatPrompt,
  buildAnnotationsPromptBlock,
  buildStudyPackFallback,
  buildStudyPackPrompt,
  collectPassages,
  extractCitations,
  formatStudyPack,
  normalizePassage,
  STUDY_CHAPTER_TEXT_MAX,
} from '../ai/study/studyPrompts';
import { chatSchema, studyPackSchema } from '../ai/validators/aiValidators';

const book = { title: 'The Name of the Wind', authors: ['Patrick Rothfuss'], description: 'A man waits to die.' };

describe('buildStudyPackPrompt', () => {
  it('anchors the prompt to the book, chapter, and supplied text', () => {
    const prompt = buildStudyPackPrompt(book, 1, 'The wind blew softly through the trees.', 'Chapter 1');
    expect(prompt).toContain('The Name of the Wind');
    expect(prompt).toContain('Patrick Rothfuss');
    expect(prompt).toContain('Chapter 1');
    expect(prompt).toContain('The wind blew softly through the trees.');
  });

  it('demands the structured JSON keys the formatter expects', () => {
    const prompt = buildStudyPackPrompt(book, 1, 'text');
    for (const key of ['summary', 'keyIdeas', 'terms', 'quiz']) {
      expect(prompt).toContain(key);
    }
  });

  it('truncates long chapter text so prompts stay bounded', () => {
    const head = 'HEADSTART';
    const tail = 'TAILMARKER_SHOULD_NOT_APPEAR';
    const text = `${head}${'x'.repeat(STUDY_CHAPTER_TEXT_MAX)}${tail}`;
    const prompt = buildStudyPackPrompt(book, 1, text);
    expect(prompt).toContain(head);
    expect(prompt).not.toContain(tail);
  });

  it('falls back gracefully for missing author shapes', () => {
    const noAuthors = buildStudyPackPrompt({ title: 'T', authors: null }, 1, 'text');
    expect(noAuthors).toContain('Unknown author');
    const stringAuthor = buildStudyPackPrompt({ title: 'T', authors: 'Only Author' }, 1, 'text');
    expect(stringAuthor).toContain('Only Author');
  });
});

describe('buildStudyPackFallback', () => {
  it('returns a deterministic offline pack with empty collections', () => {
    const pack = buildStudyPackFallback(book, 2);
    expect(pack.summary).toContain('The Name of the Wind');
    expect(pack.summary).toContain('chapter 2');
    expect(pack.keyIdeas).toEqual([]);
    expect(pack.terms).toEqual([]);
    expect(pack.quiz).toEqual([]);
  });
});

describe('formatStudyPack', () => {
  it('reports the requested book and chapter coordinates', () => {
    const packed = formatStudyPack({ summary: 's', keyIdeas: ['i'], terms: [], quiz: [] }, 'b-1', 3);
    expect(packed.bookId).toBe('b-1');
    expect(packed.chapterNum).toBe(3);
  });

  it('trims and drops empty entries from model output', () => {
    const raw = {
      summary: '  A fine summary.  ',
      keyIdeas: [' first idea ', '', ' second idea ', '   '],
      terms: [
        { term: '  kvothe ', definition: ' hero ' },
        { term: '   ', definition: 'blank term' },
        { term: 'no def', definition: '' },
      ],
      quiz: [{ question: ' Who is the hero? ', answer: ' Kvothe ' }],
    };
    const packed = formatStudyPack(raw, 'b-1', 1);
    expect(packed.summary).toBe('A fine summary.');
    expect(packed.keyIdeas).toEqual(['first idea', 'second idea']);
    expect(packed.terms).toEqual([{ term: 'kvothe', definition: 'hero' }]);
    expect(packed.quiz).toEqual([{ question: 'Who is the hero?', answer: 'Kvothe' }]);
  });

  it('caps collection sizes so giant model output cannot blow up the UI', () => {
    const manyIdeas = Array.from({ length: 30 }, (_, i) => `idea ${i}`);
    const manyTerms = Array.from({ length: 30 }, (_, i) => ({ term: `t${i}`, definition: `d${i}` }));
    const manyQuiz = Array.from({ length: 30 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));
    const packed = formatStudyPack({ summary: 's', keyIdeas: manyIdeas, terms: manyTerms, quiz: manyQuiz }, 'b-1', 1);
    expect(packed.keyIdeas.length).toBeLessThanOrEqual(8);
    expect(packed.terms.length).toBeLessThanOrEqual(6);
    expect(packed.quiz.length).toBeLessThanOrEqual(4);
  });

  it('defaults a missing summary to the first key idea', () => {
    const packed = formatStudyPack({ keyIdeas: ['Leading idea'] }, 'b-1', 1);
    expect(packed.summary).toBe('Leading idea');
  });

  it('is defensive against non-object model output', () => {
    const packed = formatStudyPack('garbage', 'b-1', 1);
    expect(packed.summary.length).toBeGreaterThan(0);
    expect(packed.keyIdeas).toEqual([]);
    expect(packed.terms).toEqual([]);
    expect(packed.quiz).toEqual([]);
  });
});

describe('studyPackSchema', () => {
  const valid = { bookId: '123e4567-e89b-12d3-a456-426614174000', chapterText: 'Once upon a time…' };

  it('accepts a valid request and defaults chapterNum to 1', () => {
    const parsed = studyPackSchema.parse(valid);
    expect(parsed.chapterNum).toBe(1);
  });

  it('rejects a non-uuid bookId', () => {
    expect(() => studyPackSchema.parse({ ...valid, bookId: 'not-a-uuid' })).toThrow();
  });

  it('rejects empty or oversized chapter text', () => {
    expect(() => studyPackSchema.parse({ ...valid, chapterText: '' })).toThrow();
    expect(() => studyPackSchema.parse({ ...valid, chapterText: 'x'.repeat(12001) })).toThrow();
  });

  it('rejects out-of-range or fractional chapter numbers', () => {
    expect(() => studyPackSchema.parse({ ...valid, chapterNum: 0 })).toThrow();
    expect(() => studyPackSchema.parse({ ...valid, chapterNum: 1.5 })).toThrow();
  });
});

describe('collectPassages', () => {
  const highlights = [
    { text: 'Fear is the mind-killer.', chapter: 1 },
    { text: '  I must not fear.  ', chapter: 1 },
    { text: 'The litany must be repeated.', chapter: 2 },
  ];
  const notes = [{ text: 'I must not fear.\nFear is the mind-killer.', chapter: 1 }];

  it('dedupes and normalizes across highlights and notes', () => {
    const passages = collectPassages(highlights, notes);
    expect(passages).toEqual([
      'Fear is the mind-killer.',
      'I must not fear.',
      'The litany must be repeated.',
      'I must not fear. Fear is the mind-killer.',
    ]);
  });

  it('narrows to one chapter when asked, dropping chapter-less rows', () => {
    const passages = collectPassages([...highlights, { text: 'Undated note', chapter: null }], [], 1);
    expect(passages).toEqual(['Fear is the mind-killer.', 'I must not fear.']);
    expect(passages.some((p) => p.includes('Undated note'))).toBe(false);
  });
});

describe('buildAnnotationsPromptBlock', () => {
  it('labels the empty case', () => {
    expect(buildAnnotationsPromptBlock([])).toContain('no saved highlights or notes');
  });

  it('numbers and quotes each passage', () => {
    const block = buildAnnotationsPromptBlock(['A', 'B']);
    expect(block).toContain('1. "A"');
    expect(block).toContain('2. "B"');
  });
});

describe('buildAnnotatedChatPrompt', () => {
  const prompt = buildAnnotatedChatPrompt({
    message: 'What stood out about the wind?',
    book: { title: 'The Name of the Wind', authors: ['Patrick Rothfuss'] },
    context: 'The wind blew through the trees.',
    history: [{ role: 'user', content: 'Earlier question' }],
    passages: ['Fear is the mind-killer.', 'I must not fear.'],
  });

  it('carries book, context, passages, history, and the question', () => {
    expect(prompt).toContain('The Name of the Wind');
    expect(prompt).toContain('The wind blew through the trees.');
    expect(prompt).toContain('1. "Fear is the mind-killer."');
    expect(prompt).toContain('2. "I must not fear."');
    expect(prompt).toContain('user: Earlier question');
    expect(prompt).toContain('What stood out about the wind?');
  });

  it('instructs the model to mark drawn-on passages with SOURCE:', () => {
    expect(prompt).toContain('SOURCE: ');
  });
});

describe('extractCitations', () => {
  const passages = ['I must not fear.', 'Fear is the mind-killer.'];

  it('drops SOURCE lines from the answer and cites the passages used', () => {
    const text = 'Fear is the mind-killer.\nSOURCE: "I must not fear."\nThat line recurs.\nSOURCE: "Fear is the mind-killer."';
    const { response, citations } = extractCitations(text, passages);
    expect(response).toBe('Fear is the mind-killer.\nThat line recurs.');
    expect(citations).toEqual(['I must not fear.', 'Fear is the mind-killer.']);
  });

  it('cites a partial verbatim quote of a longer passage', () => {
    const long = 'The candle flame guttered in the draft from the open window.';
    const { citations } = extractCitations(`It is ominous.\nSOURCE: "${long.slice(0, 40)}"`, [long]);
    expect(citations).toEqual([long]);
  });

  it('returns no citations when the model never marks a source', () => {
    const { response, citations } = extractCitations('  Just an answer with no sources.  ', passages);
    expect(response).toBe('Just an answer with no sources.');
    expect(citations).toEqual([]);
  });

  it('normalizes whitespace so verbatim quotes still match', () => {
    const { citations } = extractCitations('Ok.\nSOURCE: "I  must  not  fear."', passages);
    expect(citations).toEqual(['I must not fear.']);
  });
});

describe('normalizePassage', () => {
  it('collapses internal whitespace and trims', () => {
    expect(normalizePassage('  a\n\n b\t c  ')).toBe('a b c');
  });
});

describe('chatSchema (study-chat)', () => {
  const base = { message: 'Why did the character hesitate?' };
  const uuid = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts entryId and chapterNum for grounded chat', () => {
    const parsed = chatSchema.parse({ ...base, bookId: uuid, entryId: uuid, chapterNum: 3 });
    expect(parsed.entryId).toBe(uuid);
    expect(parsed.chapterNum).toBe(3);
  });

  it('rejects a malformed entryId', () => {
    expect(() => chatSchema.parse({ ...base, entryId: 'not-a-uuid' })).toThrow();
  });

  it('still accepts a plain chat with no entry', () => {
    const parsed = chatSchema.parse(base);
    expect(parsed.entryId).toBeUndefined();
  });
});
