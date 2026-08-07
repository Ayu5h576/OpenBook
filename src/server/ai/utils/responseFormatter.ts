import type {
  BookDNAResponse,
  ChatResponse,
  InsightsResponse,
  PlannerResponse,
  ReadingCompassResponse,
  Recommendation,
  SummaryFormat,
  SummaryResponse,
} from '../../types/ai';

export function parseJsonResponse<T>(text: string, fallback: T): T {
  try {
    const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export function formatReadingCompass(data: any): ReadingCompassResponse {
  const recommendations = Array.isArray(data) ? data : data?.recommendations;

  return {
    recommendations: (recommendations ?? []).map((rec: any): Recommendation => ({
      bookId: rec.bookId ?? '',
      title: rec.title ?? 'Untitled recommendation',
      authors: Array.isArray(rec.authors) ? rec.authors : [rec.author ?? 'Unknown author'],
      coverImage: rec.coverImage,
      reasoning: rec.reasoning ?? rec.reason ?? rec.matchReason ?? 'Matched to your library patterns.',
      matchScore: Number(rec.matchScore ?? rec.matchPercentage ?? 75),
      categories: rec.categories ?? (rec.genre ? [rec.genre] : []),
    })),
    reasoning: data?.reasoning ?? 'Generated from your library, wishlist, reviews, sessions, and goals.',
    generatedAt: new Date().toISOString(),
  };
}

export function formatBookDNA(data: any, book: any): BookDNAResponse {
  const dna = data?.dna ?? data;
  return {
    dna: {
      bookId: book.id,
      title: book.title,
      themes: dna?.themes ?? [],
      writingStyle: dna?.writingStyle ?? 'Not enough text signal yet',
      difficulty: Number(dna?.difficulty ?? 3),
      emotionalTone: dna?.emotionalTone ?? 'Balanced',
      pacing: dna?.pacing ?? 'Steady',
      complexity: Number(dna?.complexity ?? 3),
      characterDepth: Number(dna?.characterDepth ?? 3),
      worldBuilding: Number(dna?.worldBuilding ?? 3),
      philosophy: dna?.philosophy ?? 'Inferred from catalog metadata and your notes.',
      adventure: Number(dna?.adventure ?? 3),
      romance: Number(dna?.romance ?? 2),
      mystery: Number(dna?.mystery ?? 2),
    } as any,
    explanation: data?.explanation ?? dna?.explanation ?? 'Generated from book metadata and your personal interaction with this book.',
    generatedAt: new Date().toISOString(),
  };
}

export function formatSummary(format: SummaryFormat, summary: string, keyPoints?: string[]): SummaryResponse {
  return {
    format,
    summary,
    keyPoints,
    generatedAt: new Date().toISOString(),
  };
}

export function formatChat(response: string, conversationId: string): ChatResponse {
  return {
    response,
    conversationId,
    generatedAt: new Date().toISOString(),
  } as ChatResponse;
}

export function formatInsights(data: any): InsightsResponse {
  return {
    insights: data?.insights ?? data,
    generatedAt: new Date().toISOString(),
  };
}

export function formatPlanner(data: any): PlannerResponse {
  return {
    plan: data?.plan ?? data,
    generatedAt: new Date().toISOString(),
  };
}
