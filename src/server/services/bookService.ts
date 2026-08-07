import { prisma } from '../config/prisma';
import { NotFoundError, ServerError } from '../utils/errors';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1';

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    pageCount?: number;
    categories?: string[];
    language?: string;
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    averageRating?: number;
    ratingsCount?: number;
  };
}

function buildCoverUrl(imageLinks?: GoogleVolume['volumeInfo']['imageLinks']): string | undefined {
  const raw = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail;
  if (!raw) return undefined;
  return raw.replace('http://', 'https://').replace('&zoom=1', '&zoom=0');
}

function extractIsbn(ids?: { type: string; identifier: string }[]) {
  return {
    isbn10: ids?.find((i) => i.type === 'ISBN_10')?.identifier,
    isbn13: ids?.find((i) => i.type === 'ISBN_13')?.identifier,
  };
}

export interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  pageCount?: number;
  categories: string[];
  language: string;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  averageRating?: number;
  ratingsCount: number;
}

function mapVolume(v: GoogleVolume): GoogleBookResult {
  const { isbn10, isbn13 } = extractIsbn(v.volumeInfo.industryIdentifiers);
  return {
    googleBooksId: v.id,
    title: v.volumeInfo.title,
    subtitle: v.volumeInfo.subtitle,
    authors: v.volumeInfo.authors ?? [],
    description: v.volumeInfo.description,
    coverImage: buildCoverUrl(v.volumeInfo.imageLinks),
    pageCount: v.volumeInfo.pageCount,
    categories: v.volumeInfo.categories ?? [],
    language: v.volumeInfo.language ?? 'en',
    publisher: v.volumeInfo.publisher,
    publishedDate: v.volumeInfo.publishedDate,
    isbn10,
    isbn13,
    averageRating: v.volumeInfo.averageRating,
    ratingsCount: v.volumeInfo.ratingsCount ?? 0,
  };
}

async function fetchGoogle(path: string): Promise<any> {
  // Use '?' when path has no query string yet, '&' when it already does
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const key = apiKey ? `${path.includes('?') ? '&' : '?'}key=${apiKey}` : '';
  const url = `${GOOGLE_BOOKS_API}${path}${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new ServerError(`Google Books API error: ${res.status}`);
  return res.json();
}

export class BookService {
  async searchBooks(
    q: string,
    type: 'title' | 'author' | 'isbn' | 'category',
    startIndex: number,
    maxResults: number
  ): Promise<{ items: GoogleBookResult[]; totalItems: number }> {
    const prefix = { title: 'intitle:', author: 'inauthor:', isbn: 'isbn:', category: 'subject:' }[type];
    const query = encodeURIComponent(`${prefix}${q}`);
    const data = await fetchGoogle(`/volumes?q=${query}&startIndex=${startIndex}&maxResults=${maxResults}&printType=books`);
    return {
      items: (data.items ?? []).map(mapVolume),
      totalItems: data.totalItems ?? 0,
    };
  }

  async getGoogleBook(googleBooksId: string): Promise<GoogleBookResult> {
    const data = await fetchGoogle(`/volumes/${googleBooksId}`);
    return mapVolume(data as GoogleVolume);
  }

  async importBook(googleBooksId: string) {
    // Return existing record if already imported
    const existing = await prisma.book.findUnique({ where: { googleBooksId } });
    if (existing) return existing;

    const vol = await this.getGoogleBook(googleBooksId);

    return prisma.book.create({
      data: {
        googleBooksId: vol.googleBooksId,
        title: vol.title,
        subtitle: vol.subtitle,
        authors: vol.authors,
        description: vol.description,
        coverImage: vol.coverImage,
        pageCount: vol.pageCount,
        categories: vol.categories,
        language: vol.language,
        publisher: vol.publisher,
        publishedDate: vol.publishedDate,
        isbn10: vol.isbn10,
        isbn13: vol.isbn13,
        averageRating: vol.averageRating,
        ratingsCount: vol.ratingsCount,
      },
    });
  }

  async getBookById(id: string) {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundError('Book');
    return book;
  }
}

export const bookService = new BookService();
