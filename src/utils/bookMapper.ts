import { Book } from '../types';
import { LibraryEntry, LibraryStatus, WishlistEntry } from '../services/api';

/**
 * The API's `LibraryStatus` down to the UI union in `types.ts`. Mostly a
 * lowercase, except `DROPPED`, which the UI has no word for — a book set down
 * for good belongs with the archived ones rather than the merely paused.
 */
const UI_STATUS: Record<LibraryStatus, Book['status']> = {
  READING: 'reading',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  DROPPED: 'archived',
  ARCHIVED: 'archived',
  OWNED: 'owned',
};

/**
 * Spine colours, chosen deterministically from the book id.
 *
 * The 3D shelf draws a spine per book, and a single hardcoded ink meant every
 * volume came out the same black slab. Hashing the id keeps a book's spine
 * stable across renders and sessions — a reader recognises their shelf by where
 * the dark green one sits — without needing a colour column in the database.
 */
const SPINE_PALETTE = [
  '#1D1D1D', '#3E2723', '#4A2E1B', '#2C3E50', '#5D4037',
  '#37474F', '#6B4226', '#4E342E', '#263238', '#7B3F00',
];

function spineColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SPINE_PALETTE[Math.abs(hash) % SPINE_PALETTE.length];
}

/** Visual spine width in px, clamped so a novella is still clickable and a tome still fits. */
function thicknessFor(pageCount?: number | null): number {
  return Math.max(24, Math.min(60, Math.round((pageCount || 300) / 10)));
}

/**
 * Google Books descriptions arrive with markup (<p>, <br>, <i>) that would
 * render as literal tags in our own typography, so strip it before display.
 */
export function stripHtml(value?: string | null): string {
  return (value ?? '').replace(/<[^>]*>?/gm, '').trim();
}

export function googleBookToApp(gb: any): Book {
  const id = gb.googleBooksId || `book-${Date.now()}`;
  return {
    id,
    title: gb.title || 'Untitled',
    author: gb.authors?.[0] || 'Unknown Author',
    authorId: `auth-${gb.googleBooksId}`,
    // Empty, not a stock photo: BookCover draws a real cover from the title and
    // author when there's no artwork, which beats showing someone else's shelf.
    cover: gb.coverImage || '',
    spineColor: spineColorFor(id),
    thickness: thicknessFor(gb.pageCount),
    pages: gb.pageCount || 300,
    pagesRead: 0,
    publisher: gb.publisher || 'Independent',
    publishedYear: gb.publishedDate ? parseInt(gb.publishedDate.substring(0, 4)) : 2024,
    language: gb.language || 'English',
    isbn: gb.isbn13 || gb.isbn10 || `978-${Math.floor(Math.random() * 1000000000)}`,
    rating: gb.averageRating || 4.0,
    reviewCount: gb.ratingsCount || 0,
    genres: gb.categories || ['Fiction'],
    description: gb.description || '',
    status: 'owned' as const,
    favorite: false,
    progress: 0,
    lastOpened: new Date().toISOString().split('T')[0],
    chapters: [{ id: 1, title: 'Chapter 1', content: '' }],
    notes: [],
    highlights: [],
    comments: [],
  };
}

export function libraryEntryToApp(entry: LibraryEntry): Book {
  const localBook = entry.book;
  const pageCount = localBook.pageCount || 300;
  const currentPage = entry.currentPage || 0;
  const progress = Math.round((currentPage / pageCount) * 100);

  return {
    id: localBook.id,
    title: localBook.title,
    author: localBook.authors?.[0] || 'Unknown',
    authorId: `auth-${localBook.id}`,
    cover: localBook.coverImage || '',
    spineColor: spineColorFor(localBook.id),
    thickness: thicknessFor(localBook.pageCount),
    pages: pageCount,
    pagesRead: currentPage,
    publisher: localBook.publisher || 'Independent',
    publishedYear: localBook.publishedDate ? parseInt(localBook.publishedDate.substring(0, 4)) : 2024,
    language: localBook.language || 'English',
    isbn: localBook.isbn13 || localBook.isbn10 || '',
    rating: localBook.averageRating || 4.0,
    reviewCount: localBook.ratingsCount || 0,
    genres: localBook.categories || [],
    description: localBook.description || '',
    // Was hardcoded 'owned', which put every book on the 3D shelf's third plank
    // and left "Currently Reading" and "Completed" permanently empty.
    status: UI_STATUS[entry.status] ?? 'owned',
    favorite: entry.isFavorite,
    progress,
    lastOpened: entry.lastReadAt || entry.createdAt || new Date().toISOString(),
    chapters: [],
    notes: [],
    highlights: [],
    comments: [],
  };
}

/**
 * A wishlist row as a `Book`. Kept next to {@link libraryEntryToApp} because the
 * 3D shelf draws saved and owned books onto the same planks and needs them in
 * one shape.
 *
 * `status: 'wishlist'` is what puts these on the shelf's saved plank, and
 * `priority` carries through for anything that wants to rank them. Nothing has
 * been read yet, so pagesRead and progress are zero rather than guessed.
 */
export function wishlistEntryToApp(entry: WishlistEntry): Book {
  const localBook = entry.book;
  const pageCount = localBook.pageCount || 300;

  return {
    id: localBook.id,
    title: localBook.title,
    author: localBook.authors?.[0] || 'Unknown',
    authorId: `auth-${localBook.id}`,
    cover: localBook.coverImage || '',
    spineColor: spineColorFor(localBook.id),
    thickness: thicknessFor(localBook.pageCount),
    pages: pageCount,
    pagesRead: 0,
    publisher: localBook.publisher || 'Independent',
    publishedYear: localBook.publishedDate ? parseInt(localBook.publishedDate.substring(0, 4)) : 2024,
    language: localBook.language || 'English',
    isbn: localBook.isbn13 || localBook.isbn10 || '',
    rating: localBook.averageRating || 4.0,
    reviewCount: localBook.ratingsCount || 0,
    genres: localBook.categories || [],
    description: localBook.description || '',
    status: 'wishlist' as const,
    priority: entry.priority.toLowerCase() as Book['priority'],
    favorite: false,
    progress: 0,
    lastOpened: entry.createdAt,
    chapters: [],
    notes: [],
    highlights: [],
    comments: [],
  };
}
