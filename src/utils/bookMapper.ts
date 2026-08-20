import { Book } from '../types';
import { LocalBook, LibraryEntry } from '../services/api';

/**
 * Google Books descriptions arrive with markup (<p>, <br>, <i>) that would
 * render as literal tags in our own typography, so strip it before display.
 */
export function stripHtml(value?: string | null): string {
  return (value ?? '').replace(/<[^>]*>?/gm, '').trim();
}

export function googleBookToApp(gb: any): Book {
  return {
    id: gb.googleBooksId || `book-${Date.now()}`,
    title: gb.title || 'Untitled',
    author: gb.authors?.[0] || 'Unknown Author',
    authorId: `auth-${gb.googleBooksId}`,
    // Empty, not a stock photo: BookCover draws a real cover from the title and
    // author when there's no artwork, which beats showing someone else's shelf.
    cover: gb.coverImage || '',
    spineColor: '#1D1D1D',
    thickness: Math.max(20, Math.min(60, (gb.pageCount || 300) / 10)),
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
    spineColor: '#1D1D1D',
    thickness: 30,
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
    status: 'owned' as const,
    favorite: entry.isFavorite,
    progress,
    lastOpened: entry.lastReadAt || entry.createdAt || new Date().toISOString(),
    chapters: [],
    notes: [],
    highlights: [],
    comments: [],
  };
}
