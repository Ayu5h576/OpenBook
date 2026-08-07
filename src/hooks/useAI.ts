import { useCallback, useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import {
  AIApiService,
  BookDNAResponse,
  ChatResponse,
  InsightsResponse,
  PlannerResponse,
  ReadingCompassResponse,
  SummaryFormat,
  SummaryResponse,
} from '../services/api';

function useAsyncValue<T>(loader: () => Promise<{ data?: T; error?: string }>, deps: DependencyList, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const response = await loader();
    if (response.error) {
      setError(response.error);
    } else {
      setData(response.data ?? null);
    }
    setLoading(false);
  }, deps);

  useEffect(() => {
    retry();
  }, [retry]);

  return { data, loading, error, retry };
}

export function useAIHome() {
  const compass = useAsyncValue<ReadingCompassResponse>(() => AIApiService.getReadingCompass({ limit: 1 }), []);
  const insights = useAsyncValue<InsightsResponse>(() => AIApiService.getInsights(), []);

  return {
    recommendation: compass.data?.recommendations[0] ?? null,
    compass,
    insights,
    loading: compass.loading || insights.loading,
    error: compass.error || insights.error,
    retry: () => {
      compass.retry();
      insights.retry();
    },
  };
}

export function useAIBookDetail(bookId?: string) {
  const enabled = Boolean(bookId);
  const dna = useAsyncValue<BookDNAResponse>(() => AIApiService.getBookDNA(bookId as string), [bookId], enabled);
  const summary = useAsyncValue<SummaryResponse>(() => AIApiService.getSummary(bookId as string, 'quick'), [bookId], enabled);
  const planner = useAsyncValue<PlannerResponse>(() => AIApiService.getPlanner(bookId as string), [bookId], enabled);

  const loadSummary = useCallback(
    async (format: SummaryFormat) => {
      if (!bookId) return summary.data;
      const response = await AIApiService.getSummary(bookId, format);
      return response.data ?? null;
    },
    [bookId, summary.data]
  );

  const sendChat = useCallback(
    async (message: string, conversationId?: string): Promise<ChatResponse | null> => {
      if (!bookId) return null;
      const response = await AIApiService.chat({ bookId, message, conversationId });
      return response.data ?? null;
    },
    [bookId]
  );

  return {
    dna,
    summary,
    planner,
    loadSummary,
    sendChat,
    loading: dna.loading || summary.loading || planner.loading,
    error: dna.error || summary.error || planner.error,
    retry: () => {
      dna.retry();
      summary.retry();
      planner.retry();
    },
  };
}
