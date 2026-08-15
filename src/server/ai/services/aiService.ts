/**
 * AI Service - Core Gemini API Integration
 * Handles all communication with Gemini API with error handling, token tracking, and fallbacks
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import type { AIUsageLog } from '../../types/ai';

export class AIService {
  private static instance: AIService;
  private client: GoogleGenAI | null = null;

  /**
   * Model priority list — first available model wins.
   * Full "models/" prefix is REQUIRED by @google/genai v2 SDK.
   * Update by running: npx tsx scripts/list-gemini-models.ts
   */
  private readonly modelFallbacks = [
    'models/gemini-2.5-flash',      // Stable, fast — primary choice
    'models/gemini-flash-latest',   // Alias always points to latest flash
    'models/gemini-2.5-flash-lite', // Lighter, cheaper backup
  ];
  private model = this.modelFallbacks[0];

  private constructor() {
    const apiKey = env.gemini.apiKey;
    if (apiKey) {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'openbook-app',
          },
        },
      });
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generateContent(options: {
    prompt: string;
    systemInstruction?: string;
    responseFormat?: 'text' | 'json';
    temperature?: number;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    if (!this.client) {
      throw new Error('Gemini API not configured');
    }

    const config: any = {};

    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (options.responseFormat === 'json') {
      config.responseMimeType = 'application/json';
    }
    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    // Try each model in order — auto-downgrade if one is unavailable.
    let lastError: unknown;
    for (const model of this.modelFallbacks) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: options.prompt,
          config,
        });

        // Remember the first model that worked for future calls.
        if (model !== this.model) {
          console.log(`[AIService] Primary model unavailable — using ${model}`);
          this.model = model;
        }

        const text = response.text || '';
        return {
          text,
          inputTokens: this.estimateTokens(options.prompt),
          outputTokens: this.estimateTokens(text),
        };
      } catch (error: any) {
        const status: number | undefined = error?.status ?? error?.response?.status;
        const isModelError = status === 404 || error?.message?.includes('not found') || error?.message?.includes('not available');
        if (isModelError) {
          console.warn(`[AIService] Model ${model} unavailable, trying next fallback…`);
          lastError = error;
          continue;
        }
        // Non-model error — throw immediately.
        console.error('[AIService] Gemini Error:', error);
        throw error;
      }
    }

    console.error('[AIService] All model fallbacks exhausted.');
    throw lastError;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token (GPT tokenizer average)
    return Math.ceil(text.length / 4);
  }

  async logUsage(log: AIUsageLog): Promise<void> {
    // Central hook for a future persistent AI usage table.
    console.log('[AIService] Usage Log:', log);
  }
}

export const aiService = AIService.getInstance();
