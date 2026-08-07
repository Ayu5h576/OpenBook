/**
 * Prompt Templates - Centralized prompts for AI features
 * Each template builds context from user data and generates targeted responses
 */

export const promptTemplates = {
  readingCompass: (profile: any, limit = 5): string => `You are OpenBook's expert literary curator. Analyze this authenticated reader's real database profile and recommend ${limit} highly personalized books.

Rules:
- Do not give generic recommendations.
- Base every recommendation on specific library, wishlist, review, rating, collection, session, genre, author, speed, or goal signals below.
- Explain why each recommendation fits this reader.

Reader Profile:
- Favorite Genres: ${profile.favoriteGenres.join(', ')}
- Books Read: ${profile.statistics.totalBooksRead}
- Average Rating: ${profile.statistics.averageRating}/5
- Reading Speed: ${profile.statistics.averageReadingSpeed} pages/hour
- Currently Reading: ${profile.statistics.booksReading} book(s)

Recent Books:
${profile.readingHistory.slice(0, 5).map((b: any) => `- "${b.title}" by ${b.authors.join(', ')} (${b.status}) - ${b.rating ? `Rating: ${b.rating}/5` : 'Not rated'}`).join('\n')}

Wishlist:
${profile.wishlist.slice(0, 10).map((b: any) => `- "${b.title}" by ${b.authors.join(', ')} (${b.priority}) Genres: ${b.categories.join(', ')}`).join('\n') || '- No wishlist items'}

Collections:
${profile.collections.map((c: any) => `- ${c.name}: ${c.bookCount} books`).join('\n') || '- No collections'}

Return JSON with:
{
 "reasoning": "Overall explanation grounded in the user's data",
 "recommendations": [
  {
    "title": "Book Title",
    "authors": ["Author1", "Author2"],
    "genre": "Primary Genre",
    "reasoning": "Detailed explanation of why this book matches their profile",
    "matchScore": 85,
    "categories": ["Category1", "Category2"]
  }
 ]
}`,

  bookDNA: (bookContext: any): string => `You are a literary analyst specializing in book DNA - the essence of a book's style, tone, and substance.

Book: "${bookContext.title}" by ${bookContext.authors.join(', ')}
Description: ${bookContext.description}
Categories: ${bookContext.categories.join(', ')}
${bookContext.userReview ? `User's Rating: ${bookContext.userReview.rating}/5\nUser's Notes: ${bookContext.userReview.body || 'None'}` : ''}

Analyze this book and return detailed Book DNA in JSON format:
{
  "themes": [{"name": "Theme Name", "weight": 0.85}],
  "writingStyle": "Literary fiction style description",
  "difficulty": 3,
  "emotionalTone": "Emotional tone description",
  "pacing": "Fast/Steady/Slow with explanation",
  "complexity": 4,
  "characterDepth": 4,
  "worldBuilding": 3,
  "philosophy": "Underlying worldview",
  "adventure": 2,
  "romance": 1,
  "mystery": 4,
  "explanation": "Why these scores follow from metadata and user context"
}

Be specific and insightful. Scales are 1-5.`,

  quickSummary: (bookContext: any, spoilerLevel = 'none'): string => `Provide a concise 3-part summary of "${bookContext.title}".
Spoiler level: ${spoilerLevel}.
1. Executive Essence (1 sentence capturing the core)
2. Key Takeaways (3 bullet points)
3. Ideal Reader Profile (who should read this)

Keep it spoiler-free and engaging.`,

  detailedSummary: (bookContext: any, spoilerLevel = 'none'): string => `Provide a comprehensive summary of "${bookContext.title}" by ${bookContext.authors.join(', ')}.
Spoiler level: ${spoilerLevel}.

${bookContext.description}

Create:
1. Plot Overview (3-4 paragraphs)
2. Character Analysis (main characters and their arcs)
3. Themes & Motifs (key literary elements)
4. Critical Reception & Significance

Keep it spoiler-free unless explicitly requested.`,

  summary(bookContext: any, format: string, spoilerLevel = 'none'): string {
    if (format === 'quick') return this.quickSummary(bookContext, spoilerLevel);
    if (format === 'detailed') return this.detailedSummary(bookContext, spoilerLevel);
    return `Create a ${format} summary for "${bookContext.title}" by ${bookContext.authors.join(', ')}.
Spoiler level: ${spoilerLevel}.
Book metadata: ${bookContext.description}
User context: ${JSON.stringify(bookContext.userEntry ?? {})}
Return clear markdown. Include key takeaways and important quotes only when they are present in provided user highlights/quotes.`;
  },

  personalInsights: (profile: any): string => `Generate personalized reading insights for this reader:

Reading Statistics:
- Total Books: ${profile.statistics.totalBooksRead}
- Pages Read: ${profile.statistics.totalPagesRead}
- Reading Speed: ${profile.statistics.averageReadingSpeed} pages/hour
- Average Rating: ${profile.statistics.averageRating}/5
- Favorite Genres: ${profile.favoriteGenres.join(', ')}

Library Overview:
- Currently Reading: ${profile.statistics.booksReading}
- Wishlist Items: ${profile.readingHistory.length}

Recent Library:
${profile.readingHistory.slice(0, 12).map((b: any) => `- "${b.title}" ${b.status}, rating ${b.rating ?? 'N/A'}, genres ${b.categories.join(', ')}`).join('\n') || '- No books yet'}

Wishlist:
${profile.wishlist.slice(0, 8).map((b: any) => `- "${b.title}" by ${b.authors.join(', ')}`).join('\n') || '- No wishlist yet'}

Provide insights in JSON format:
{
  "favoriteGenres": [{"genre": "Genre", "percentage": 40}],
  "readingSpeed": 42,
  "averageRating": 4.2,
  "totalBooksRead": 12,
  "totalPagesRead": 3200,
  "currentReadingStreak": 3,
  "nextLikelyBook": {"bookId": "id if known", "title": "Title", "reasoning": "why"},
  "moodPattern": "Mood pattern inferred from real data",
  "readingTrend": "increasing/decreasing/stable",
  "mostHighlightedThemes": ["Theme"]
}`,

  smartPlanner: (userEntry: any, bookContext: any, profile: any, dailyAvailableMinutes = 60): string => `Create a personalized reading plan for "${bookContext.title}".

Book Details:
- Total Pages: ${bookContext.pageCount}
- Current Progress: ${userEntry?.currentPage || 0} pages
- User's Reading Speed: ${profile.statistics.averageReadingSpeed} pages/hour
- Daily Available Minutes: ${dailyAvailableMinutes}

Generate a weekly reading schedule in JSON:
{
  "dailyPages": 20,
  "weeklySchedule": [
    {"day": "Monday", "targetPages": 30, "estimatedMinutes": 45},
    {"day": "Tuesday", "targetPages": 25, "estimatedMinutes": 40},
    ...
  ],
  "estimatedFinishDate": "2026-09-15",
  "adaptiveNotes": "Personalized reading advice"
}`,

  bookChat: (message: string, bookContext: any, profile: any, history: any[] = [], extraContext?: string): string => `You are a knowledgeable book guide.

Reader profile:
- Favorite genres: ${profile.favoriteGenres.join(', ') || 'not enough data'}
- Average reading speed: ${profile.statistics.averageReadingSpeed} pages/hour
- Highly relevant recent books: ${profile.readingHistory.slice(0, 5).map((b: any) => b.title).join(', ') || 'none'}

Book Context:
${bookContext ? `Title: ${bookContext.title}
Authors: ${bookContext.authors.join(', ')}
Description: ${bookContext.description}
Categories: ${bookContext.categories.join(', ')}
User progress: ${bookContext.userEntry?.currentPage ?? 0}/${bookContext.pageCount ?? '?'} pages
User review: ${bookContext.userReview?.body ?? 'none'}` : 'No single book selected.'}

Recent conversation:
${history.slice(-8).map((m: any) => `${m.role}: ${m.content}`).join('\n') || 'No previous messages.'}

Additional user context:
${extraContext ?? 'None'}

User Question: "${message}"

Answer thoughtfully and helpfully. Use only the provided reader/book context. Avoid major spoilers unless explicitly asked.`,

  searchIntent: (query: string): string => `Analyze this search query for reading intent: "${query}"

Return JSON with:
{
  "intent": "Character/Theme/Genre/Author/Mood/Recommendation",
  "keywords": ["keyword1", "keyword2"],
  "suggestedGenres": ["Genre1", "Genre2"],
  "editorialInsight": "What kind of reading experience they're seeking"
}`,

  similarBooks: (bookContext: any, readerGenres: string[], limit = 5): string => `Find ${limit} books similar to "${bookContext.title}" by ${bookContext.authors.join(', ')}.

Book Profile:
- Categories: ${bookContext.categories.join(', ')}
- Reader's Favorite Genres: ${readerGenres.join(', ')}

Recommend 5 similar books with explanations. Return JSON:
[
  {
    "title": "Similar Book Title",
    "authors": ["Author"],
    "similarity": 85,
    "reason": "Why it's similar to the original book"
  }
]`,
};
