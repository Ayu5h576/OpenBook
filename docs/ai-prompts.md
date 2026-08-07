# AI Prompt Policy

The prompt builder lives in `src/server/ai/templates/prompts.ts`.

## Core Rules

- Every personalized answer must be grounded in authenticated user database context.
- Recommendations must explain why the book matches the user's actual history.
- Spoilers are avoided unless the caller requests `spoilerLevel: "full"` or asks explicitly.
- Chat responses may use book metadata, user progress, notes/review context, and recent chat history.
- If Gemini is offline, fallback responses must use local user data instead of generic titles.

## Templates

- `readingCompass(profile, limit)`: Recommendations from library, wishlist, reviews, collections, sessions, genres, authors, speed, and goals.
- `bookDNA(bookContext)`: Themes, writing style, difficulty, tone, pacing, complexity, characters, world building, philosophy, adventure, romance, mystery.
- `summary(bookContext, format, spoilerLevel)`: Quick, detailed, chapter, theme, and character summaries.
- `bookChat(message, bookContext, profile, history, extraContext)`: Conversation-aware, spoiler-aware book Q&A.
- `personalInsights(profile)`: Trends, diversity, next likely book, mood patterns, speed and taste analysis.
- `smartPlanner(userEntry, bookContext, profile, minutes)`: Daily/weekly/monthly planning and estimated finish date.
- `similarBooks(bookContext, readerGenres, limit)`: Similar books grounded in book DNA and reader taste.
