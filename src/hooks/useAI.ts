import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AIApiService,
  ChatResponse,
  SummaryFormat,
} from '../services/api';

export function useAIHome() {
  const compassQuery = useQuery({
    queryKey: ['ai', 'compass'],
    queryFn: async () => {
      const res = await AIApiService.getReadingCompass({ limit: 1 });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const insightsQuery = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: async () => {
      const res = await AIApiService.getInsights();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const loading = compassQuery.isLoading || insightsQuery.isLoading;
  const error = compassQuery.error?.message || insightsQuery.error?.message || null;

  return {
    recommendation: compassQuery.data?.recommendations?.[0] ?? null,
    compass: { data: compassQuery.data ?? null, loading: compassQuery.isLoading, error: compassQuery.error?.message ?? null },
    insights: { data: insightsQuery.data ?? null, loading: insightsQuery.isLoading, error: insightsQuery.error?.message ?? null },
    loading,
    error,
    retry: () => {
      compassQuery.refetch();
      insightsQuery.refetch();
    },
  };
}

export function useAIBookDetail(bookId?: string) {
  const enabled = Boolean(bookId);

  const dnaQuery = useQuery({
    queryKey: ['ai', 'dna', bookId],
    queryFn: async () => {
      const res = await AIApiService.getBookDNA(bookId as string);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled,
  });

  const summaryQuery = useQuery({
    queryKey: ['ai', 'summary', bookId, 'quick'],
    queryFn: async () => {
      const res = await AIApiService.getSummary(bookId as string, 'quick');
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled,
  });

  const plannerQuery = useQuery({
    queryKey: ['ai', 'planner', bookId],
    queryFn: async () => {
      const res = await AIApiService.getPlanner(bookId as string);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled,
  });

  const loadSummary = useCallback(
    async (format: SummaryFormat) => {
      if (!bookId) return summaryQuery.data ?? null;
      const response = await AIApiService.getSummary(bookId, format);
      return response.data ?? null;
    },
    [bookId, summaryQuery.data]
  );

  const sendChat = useCallback(
    async (message: string, conversationId?: string): Promise<ChatResponse | null> => {
      if (!bookId) return null;
      const response = await AIApiService.chat({ bookId, message, conversationId });
      return response.data ?? null;
    },
    [bookId]
  );

  const loading = dnaQuery.isLoading || summaryQuery.isLoading || plannerQuery.isLoading;
  const error = dnaQuery.error?.message || summaryQuery.error?.message || plannerQuery.error?.message || null;

  return {
    dna: { data: dnaQuery.data ?? null, loading: dnaQuery.isLoading, error: dnaQuery.error?.message ?? null },
    summary: { data: summaryQuery.data ?? null, loading: summaryQuery.isLoading, error: summaryQuery.error?.message ?? null },
    planner: { data: plannerQuery.data ?? null, loading: plannerQuery.isLoading, error: plannerQuery.error?.message ?? null },
    loadSummary,
    sendChat,
    loading,
    error,
    retry: () => {
      dnaQuery.refetch();
      summaryQuery.refetch();
      plannerQuery.refetch();
    },
  };
}
