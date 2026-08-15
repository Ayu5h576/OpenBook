/**
 * Quick script to list all models available to your Gemini API key.
 * Run with: npx tsx scripts/list-gemini-models.ts
 */
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

console.log('Fetching available models...\n');

const result = await client.models.list();
const models: string[] = [];

// SDK v2 returns a paginated list object
const items: any[] = Array.isArray(result)
  ? result
  : (result as any).models ?? (result as any).page ?? [];

for (const model of items) {
  const name = model.name ?? model.model ?? '';
  models.push(name);
  console.log('✅', name, '-', model.displayName ?? model.description ?? '');
}

if (models.length === 0) {
  // Fallback: dump the raw response so we can inspect it
  console.log('Raw response:', JSON.stringify(result, null, 2));
}

console.log(`\nTotal: ${models.length} model(s) available.`);

// Suggest the best flash model
const flashModels = models.filter(m => m.toLowerCase().includes('flash'));
if (flashModels.length) {
  console.log('\n🔥 Flash models available:');
  flashModels.forEach(m => console.log('  ', m));
  console.log('\n👉 Recommended model string for aiService.ts:', flashModels[0]);
}
