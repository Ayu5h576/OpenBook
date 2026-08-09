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
  private model = 'gemini-2.0-flash';

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

    try {
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

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: options.prompt,
        config,
      });

      const text = response.text || '';

      // Token counting (estimated - Gemini API may not return exact counts in all SDKs)
      const inputTokens = this.estimateTokens(options.prompt);
      const outputTokens = this.estimateTokens(text);

      return {
        text,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      console.error('[AIService] Gemini Error:', error);
      throw error;
    }
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
