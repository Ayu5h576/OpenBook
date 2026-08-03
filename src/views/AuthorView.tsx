import React from 'react';
import { Author, Book } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { Award, Calendar, MapPin, Sparkles } from 'lucide-react';

interface AuthorViewProps {
  author: Author;
  authorBooks: Book[];
  onSelectBook: (book: Book) => void;
}

export const AuthorView: React.FC<AuthorViewProps> = ({ author, authorBooks, onSelectBook }) => {
  return (
    <div className="space-y-8 pb-12">
      
      {/* Author Header Spotlight */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-lg grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-4 flex justify-center">
          <div className="w-48 h-48 rounded-full overflow-hidden shadow-warm-md border-4 border-[#EFE8DD]">
            <img src={author.portrait} alt={author.name} className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="md:col-span-8 space-y-3">
          <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider bg-[#EFE8DD] px-3 py-1 rounded-full">
            Featured Author Monograph
          </span>
          <h1 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#1D1D1D]">{author.name}</h1>
          <div className="flex items-center gap-4 text-xs text-[#777777]">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{author.location}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Born {author.born}</span>
          </div>
          <p className="text-sm text-[#777777] leading-relaxed font-normal pt-2">{author.bio}</p>
        </div>
      </div>

      {/* Published Works Grid */}
      <section>
        <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-4">Published Volumes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {authorBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      </section>

    </div>
  );
};
