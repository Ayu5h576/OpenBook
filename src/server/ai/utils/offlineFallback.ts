/**
 * Offline Fallback - Graceful degradation when Gemini API is unavailable
 */

export const offlineFallbacks = {
  readingCompass: {
    recommendations: [
      {
        title: 'The Midnight Library',
        authors: ['Matt Haig'],
        genre: 'Contemporary Fiction',
        reasoning: 'A captivating exploration of choice and possibility. Perfect for readers seeking meaningful stories.',
        matchScore: 85,
        categories: ['Fiction', 'Philosophy'],
      },
      {
        title: 'Project Hail Mary',
        authors: ['Andy Weir'],
        genre: 'Science Fiction',
        reasoning: 'An engaging blend of humor, science, and heart. Great for readers who enjoy problem-solving narratives.',
        matchScore: 82,
        categories: ['Science Fiction', 'Adventure'],
      },
    ],
    message: '[Offline Mode] Here are some universally beloved recommendations while we reconnect to our AI.',
  },

  bookDNA: {
    dna: {
      themes: [
        { name: 'Human Connection', weight: 0.9 },
        { name: 'Personal Growth', weight: 0.85 },
        { name: 'Resilience', weight: 0.8 },
      ],
      writingStyle: 'Engaging and accessible with emotional depth',
      difficulty: 3,
      emotionalTone: 'Hopeful and thought-provoking',
      pacing: 'Steady with engaging moments',
      complexity: 3,
      characterDepth: 4,
      worldBuilding: 3,
    },
    message: '[Offline Mode] Here is the Book DNA profile based on available data.',
  },

  summary: {
    summary: '[Offline Mode] Unable to generate AI summary at this moment. Please try again when connection is restored.',
    message: 'Try reading reviews or notes from our community to learn more about this book.',
  },

  insights: {
    insights: {
      favoriteGenres: [{ genre: 'Literary Fiction', percentage: 35 }, { genre: 'Science Fiction', percentage: 25 }],
      readingSpeed: 40,
      averageRating: 4.2,
      totalBooksRead: 24,
      totalPagesRead: 5840,
      currentReadingStreak: 7,
      nextLikelyBook: {
        bookId: '',
        title: 'Check your wishlist!',
        reasoning: 'Your next great read awaits in your wishlist.',
      },
      moodPattern: 'You tend to read more in the evenings.',
      readingTrend: 'stable',
      mostHighlightedThemes: ['Love', 'Adventure', 'Self-discovery'],
    },
    message: '[Offline Mode] These insights are based on your reading history stored locally.',
  },

  planner: {
    plan: {
      dailyPages: 20,
      weeklySchedule: [
        { day: 'Monday', targetPages: 25, estimatedMinutes: 40 },
        { day: 'Tuesday', targetPages: 20, estimatedMinutes: 35 },
        { day: 'Wednesday', targetPages: 20, estimatedMinutes: 35 },
        { day: 'Thursday', targetPages: 25, estimatedMinutes: 40 },
        { day: 'Friday', targetPages: 30, estimatedMinutes: 50 },
        { day: 'Saturday', targetPages: 40, estimatedMinutes: 65 },
        { day: 'Sunday', targetPages: 25, estimatedMinutes: 40 },
      ],
      estimatedFinishDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyGoal: 175,
      adaptiveNotes: 'Generic schedule - personalized plan will be available when connection is restored.',
    },
    message: '[Offline Mode] This is a basic reading schedule. Your AI-powered plan will be more tailored.',
  },
};

export const getOfflineFallback = (feature: string): any => {
  const key = feature.toLowerCase().replace(/-/g, '_');
  return (offlineFallbacks as any)[key] || { message: '[Offline Mode] Feature temporarily unavailable.' };
};

export function buildPersonalizedReadingCompassFallback(profile: any, limit = 5) {
  const completedFavorites = profile.readingHistory.filter((book: any) => book.isFavorite || Number(book.rating ?? 0) >= 4);
  const wishlistMatches = profile.wishlist.filter((item: any) =>
    item.categories?.some((genre: string) => profile.favoriteGenres.includes(genre))
  );
  const source = [...wishlistMatches, ...profile.wishlist].slice(0, limit);

  return {
    recommendations: source.map((book: any, index: number) => ({
      bookId: book.bookId,
      title: book.title,
      authors: book.authors,
      reasoning:
        profile.favoriteGenres.length > 0
          ? `This is already in your wishlist and overlaps with your strongest genres: ${profile.favoriteGenres.slice(0, 3).join(', ')}.`
          : `This is already in your wishlist, so it is grounded in books you explicitly saved.`,
      matchScore: Math.max(70, 95 - index * 5),
      categories: book.categories ?? [],
    })),
    reasoning:
      source.length > 0
        ? `Offline mode used your wishlist, favorites, ratings, and genre distribution instead of generic picks.`
        : `Add books to your library or wishlist to unlock personalized offline recommendations.`,
    basedOn: completedFavorites.slice(0, 3).map((book: any) => book.title),
  };
}

export function buildPersonalizedInsightsFallback(profile: any) {
  const totalGenreMentions = Math.max(1, profile.readingHistory.flatMap((book: any) => book.categories ?? []).length);
  const favoriteGenres = profile.favoriteGenres.map((genre: string) => ({
    genre,
    percentage: Math.round(
      (profile.readingHistory.filter((book: any) => book.categories?.includes(genre)).length / totalGenreMentions) * 100
    ),
  }));
  const next = profile.wishlist[0] ?? profile.readingHistory.find((book: any) => book.status === 'READING');

  return {
    favoriteGenres,
    readingSpeed: profile.statistics.averageReadingSpeed,
    averageRating: Number(profile.statistics.averageRating),
    totalBooksRead: profile.statistics.totalBooksRead,
    totalPagesRead: profile.statistics.totalPagesRead,
    currentReadingStreak: 0,
    nextLikelyBook: {
      bookId: next?.bookId ?? '',
      title: next?.title ?? 'Add a wishlist book',
      reasoning: next ? 'Selected from your own wishlist/current reading list.' : 'No personal next-book signal is available yet.',
    },
    moodPattern: profile.favoriteGenres.length
      ? `Your saved and completed books cluster around ${profile.favoriteGenres.slice(0, 3).join(', ')}.`
      : 'Not enough genre history yet.',
    readingTrend: profile.statistics.booksReading > 0 ? 'stable' : 'decreasing',
    mostHighlightedThemes: profile.favoriteGenres.slice(0, 5),
  };
}

export function buildPlannerFallback(book: any, profile: any, dailyAvailableMinutes = 60) {
  const speed = profile.statistics.averageReadingSpeed || 30;
  const currentPage = book.userEntry?.currentPage ?? 0;
  const remainingPages = Math.max(1, (book.pageCount ?? currentPage + speed * 5) - currentPage);
  const dailyPages = Math.max(5, Math.round((speed * dailyAvailableMinutes) / 60));
  const daysRemaining = Math.ceil(remainingPages / dailyPages);
  const finishDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return {
    dailyPages,
    weeklyGoal: dailyPages * 7,
    estimatedFinishDate: finishDate.toISOString().slice(0, 10),
    weeklySchedule: days.map((day) => ({
      day,
      targetPages: dailyPages,
      estimatedMinutes: dailyAvailableMinutes,
    })),
    adaptiveNotes: `Based on your logged speed of ${speed} pages/hour and current progress in ${book.title}.`,
  };
}
