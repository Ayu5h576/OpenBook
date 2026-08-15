export type ViewMode = 
  | 'landing'
  | 'auth'
  | 'home'
  | 'book-detail'
  | 'explore'
  | 'library'
  | 'wishlist'
  | 'collections'
  | 'collection-detail'
  | 'club-detail'
  | 'reader'
  | 'community'
  | 'profile'
  | 'author'
  | 'statistics'
  | 'achievements'
  | 'settings'
  | 'reading-room'
  | 'bookshelf-3d'
  | 'reading-journey'
  | 'wishlist-galaxy'
  | 'book-dna'
  | 'reading-compass'
  | 'book-memories'
  | 'quote-wall'
  | 'smart-planner';

export interface Chapter {
  id: number;
  title: string;
  content: string;
}

export interface BookNote {
  id: string;
  chapter: number;
  text: string;
  date: string;
  page: number;
}

export interface Highlight {
  id: string;
  chapter: number;
  text: string;
  color: string;
  date: string;
}

export interface BookComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  date: string;
  likes: number;
}

export interface BookMemory {
  quote: string;
  topTakeaway: string;
  rating: number;
  moodTag: string;
  finishedDate: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  authorId: string;
  cover: string;
  spineColor: string;
  spineTextColor?: string;
  thickness: number; // e.g. 24 to 48 mm visual width
  pages: number;
  pagesRead: number;
  publisher: string;
  publishedYear: number;
  language: string;
  isbn: string;
  rating: number;
  reviewCount: number;
  genres: string[];
  description: string;
  status: 'reading' | 'completed' | 'paused' | 'archived' | 'wishlist' | 'owned';
  priority?: 'high' | 'medium' | 'low';
  price?: string;
  availability?: string;
  readingOrder?: number;
  favorite: boolean;
  progress: number; // 0 to 100
  lastOpened: string;
  finishedDate?: string;
  memoryCard?: BookMemory;
  chapters: Chapter[];
  notes: BookNote[];
  highlights: Highlight[];
  comments: BookComment[];
  quote?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  bookIds: string[];
  badgeColor: string;
  theme: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  totalNeeded: number;
  category: 'pages' | 'streak' | 'reviews' | 'collector' | 'special';
}

export interface Quote {
  id: string;
  text: string;
  bookTitle: string;
  author: string;
  category: string;
  addedDate: string;
  likes: number;
  isLiked?: boolean;
}

export interface Author {
  id: string;
  name: string;
  portrait: string;
  bio: string;
  born: string;
  location: string;
  notableWorks: string[];
  achievements: string[];
  timeline: { year: string; event: string }[];
  relatedAuthorNames: string[];
}

export interface ReaderUser {
  name: string;
  username: string;
  avatar: string;
  email: string;
  bio: string;
  followingCount: number;
  followersCount: number;
  streakDays: number;
  todayMinutesRead: number;
  todayGoalMinutes: number;
  yearlyGoalBooks: number;
  yearlyReadBooks: number;
  currentBookId: string;
}

export interface ReadingRoomSettings {
  ambientSound: 'none' | 'rain' | 'fireplace' | 'library' | 'cafe';
  lightingTheme: 'warm-amber' | 'soft-candle' | 'daylight' | 'twilight';
  backgroundStyle: 'wood-paneled' | 'nordic-attic' | 'window-view' | 'minimalist-study';
  rainIntensity: number; // 0-100
  lampBrightness: number; // 0-100
}

export interface ReaderSettings {
  fontFamily: 'Newsreader' | 'Cormorant Garamond' | 'Plus Jakarta Sans' | 'Monospace';
  fontSize: number; // 14 - 28
  lineHeight: number; // 1.4 - 2.0
  marginWidth: 'narrow' | 'medium' | 'wide';
  theme: 'ivory' | 'parchment' | 'sepia' | 'dark-velvet' | 'midnight';
  brightness: number; // 50 - 100
}
