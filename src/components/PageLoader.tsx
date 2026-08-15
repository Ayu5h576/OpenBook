import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-[var(--muted)] animate-spin" />
      </div>
      <p className="mt-4 text-sm font-medium text-[var(--muted)]">Loading...</p>
    </div>
  );
};
