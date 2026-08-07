# AI API

All routes require authentication and are mounted under `/api/ai`.

## `POST /api/ai/reading-compass`

Generates personalized recommendations.

Body:

```json
{ "limit": 5, "genres": ["Science Fiction"], "useCache": true }
```

Response:

```json
{
  "recommendations": [
    {
      "bookId": "",
      "title": "Book Title",
      "authors": ["Author"],
      "reasoning": "Why this matches the user's real history.",
      "matchScore": 88,
      "categories": ["Fiction"]
    }
  ],
  "reasoning": "Overall grounded rationale.",
  "generatedAt": "2026-08-07T00:00:00.000Z"
}
```

## `POST /api/ai/book-dna`

Body:

```json
{ "bookId": "uuid", "useCache": true }
```

Returns themes, style, difficulty, emotional tone, pacing, complexity, character depth, world building, philosophy, adventure, romance, and mystery scores.

## `POST /api/ai/summaries`

Body:

```json
{ "bookId": "uuid", "format": "quick", "spoilerLevel": "none" }
```

Formats: `quick`, `detailed`, `chapter`, `theme`, `character`.

## `POST /api/ai/chat`

Body:

```json
{
  "bookId": "uuid",
  "message": "Explain this chapter without spoilers.",
  "context": "Optional reader-selected excerpt.",
  "conversationId": "optional"
}
```

Maintains short-lived server-side conversation history.

## `POST /api/ai/insights`

Body:

```json
{ "useCache": true }
```

Returns favorite genres, speed, ratings, totals, trend, mood pattern, likely next book, and highlighted themes.

## `POST /api/ai/planner`

Body:

```json
{ "bookId": "uuid", "dailyAvailableMinutes": 45 }
```

Returns daily pages, weekly schedule, weekly goal, estimated finish date, and adaptive notes.

## `POST /api/ai/search-similar`

Body:

```json
{ "bookId": "uuid", "limit": 5 }
```
