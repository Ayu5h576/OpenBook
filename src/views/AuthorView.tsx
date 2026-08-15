import React from 'react';
import { Book } from '../types';
import { User, Construction } from 'lucide-react';

interface AuthorViewProps {
  author: any; // Kept for prop compatibility in App.tsx
  authorBooks: Book[];
  onSelectBook: (book: Book) => void;
}

export const AuthorView: React.FC<AuthorViewProps> = () => {
  return (
    <div className="space-y-8 pb-12 h-full min-h-[70vh] flex flex-col items-center justify-center">
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 md:p-12 shadow-warm-lg max-w-lg text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-beige)] text-[#A0522D] flex items-center justify-center shadow-inner">
          <Construction className="w-8 h-8" />
        </div>
        
        <h2 className="font-serif-title text-3xl font-bold text-[var(--ink)]">Author Profiles</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          Detailed author biographies, bibliographies, and related author networks are currently under construction. This feature will be available in an upcoming update.
        </p>

        <div className="bg-[var(--bg-ivory)] w-full rounded-2xl p-4 mt-2 border border-[var(--border-light)]">
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ink)] justify-center">
            <User className="w-4 h-4 text-[#A0522D]" />
            <span>Coming in Phase 6: Performance & Launch</span>
          </div>
        </div>
      </div>
    </div>
  );
};
