import React from 'react';

export const BookCardSkeleton: React.FC<{ layout?: 'grid' | 'horizontal' }> = ({ layout = 'grid' }) => {
  if (layout === 'horizontal') {
    return (
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-4 animate-pulse">
        <div className="w-16 h-24 rounded-lg bg-[var(--bg-beige)] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-20 h-2.5 bg-[var(--bg-beige)] rounded-full" />
          <div className="w-3/4 h-4 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-1/2 h-3 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-full h-1.5 bg-[var(--bg-beige)] rounded-full mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-4 flex flex-col justify-between animate-pulse">
      <div>
        <div className="aspect-[2/3] w-full rounded-2xl bg-[var(--bg-beige)] mb-4" />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-16 h-2.5 bg-[var(--bg-beige)] rounded-full" />
            <div className="w-10 h-3 bg-[var(--bg-beige)] rounded-full" />
          </div>
          <div className="w-full h-5 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-2/3 h-3 bg-[var(--bg-beige)] rounded-md" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between">
        <div className="w-16 h-3 bg-[var(--bg-beige)] rounded-full" />
        <div className="w-20 h-3 bg-[var(--bg-beige)] rounded-full" />
      </div>
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md animate-pulse flex flex-col md:flex-row items-center gap-8">
      <div className="w-40 sm:w-48 h-60 sm:h-72 rounded-2xl bg-[var(--bg-beige)] flex-shrink-0" />
      <div className="flex-1 space-y-4 w-full">
        <div className="w-36 h-6 bg-[var(--bg-beige)] rounded-full" />
        <div className="space-y-2">
          <div className="w-3/4 h-8 bg-[var(--bg-beige)] rounded-lg" />
          <div className="w-1/2 h-4 bg-[var(--bg-beige)] rounded-md" />
        </div>
        <div className="w-full h-12 bg-[var(--bg-beige)] rounded-xl" />
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <div className="w-24 h-3 bg-[var(--bg-beige)] rounded-full" />
            <div className="w-20 h-3 bg-[var(--bg-beige)] rounded-full" />
          </div>
          <div className="w-full h-2.5 bg-[var(--bg-beige)] rounded-full" />
        </div>
        <div className="pt-2 flex gap-4">
          <div className="w-36 h-10 bg-[var(--bg-beige)] rounded-full" />
          <div className="w-28 h-10 bg-[var(--bg-beige)] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const BookDetailSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-10 shadow-warm-lg animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
      <div className="lg:col-span-4 flex flex-col items-center">
        <div className="w-56 sm:w-64 h-80 sm:h-96 rounded-2xl bg-[var(--bg-beige)]" />
        <div className="flex gap-3 mt-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-beige)]" />
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-beige)]" />
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-beige)]" />
        </div>
      </div>
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="w-20 h-5 bg-[var(--bg-beige)] rounded-full" />
            <div className="w-24 h-5 bg-[var(--bg-beige)] rounded-full" />
          </div>
          <div className="w-3/4 h-10 bg-[var(--bg-beige)] rounded-lg" />
          <div className="w-1/3 h-5 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-48 h-6 bg-[var(--bg-beige)] rounded-full my-4" />
          <div className="space-y-2">
            <div className="w-full h-4 bg-[var(--bg-beige)] rounded-md" />
            <div className="w-full h-4 bg-[var(--bg-beige)] rounded-md" />
            <div className="w-2/3 h-4 bg-[var(--bg-beige)] rounded-md" />
          </div>
        </div>
        <div className="flex gap-4 pt-4 border-t border-[var(--border-light)]">
          <div className="w-32 h-12 bg-[var(--bg-beige)] rounded-full" />
          <div className="w-32 h-12 bg-[var(--bg-beige)] rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[var(--bg-ivory)] rounded-2xl border border-[var(--border-light)]">
          <div className="w-full h-8 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-full h-8 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-full h-8 bg-[var(--bg-beige)] rounded-md" />
          <div className="w-full h-8 bg-[var(--bg-beige)] rounded-md" />
        </div>
      </div>
    </div>
  );
};

/** Library list-row skeleton */
export const LibraryRowSkeleton: React.FC = () => (
  <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-4 animate-pulse">
    <div className="w-14 h-20 rounded-xl bg-[var(--bg-beige)] flex-shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="w-16 h-2.5 bg-[var(--bg-beige)] rounded-full" />
      <div className="w-3/4 h-4 bg-[var(--bg-beige)] rounded-md" />
      <div className="w-1/2 h-3 bg-[var(--bg-beige)] rounded-md" />
      <div className="w-full h-1.5 bg-[var(--bg-beige)] rounded-full mt-1" />
    </div>
    <div className="w-20 h-7 bg-[var(--bg-beige)] rounded-full flex-shrink-0" />
  </div>
);

/** Stats card skeleton */
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 animate-pulse space-y-2">
    <div className="w-8 h-8 rounded-xl bg-[var(--bg-beige)]" />
    <div className="w-16 h-7 bg-[var(--bg-beige)] rounded-md" />
    <div className="w-24 h-3 bg-[var(--bg-beige)] rounded-full" />
  </div>
);

/** Activity feed row skeleton */
export const ActivityItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-3 animate-pulse py-3 border-b border-[var(--border-light)] last:border-0">
    <div className="w-9 h-9 rounded-full bg-[var(--bg-beige)] flex-shrink-0" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="w-3/4 h-3.5 bg-[var(--bg-beige)] rounded-md" />
      <div className="w-1/2 h-2.5 bg-[var(--bg-beige)] rounded-full" />
    </div>
    <div className="w-10 h-2.5 bg-[var(--bg-beige)] rounded-full flex-shrink-0" />
  </div>
);

/** Book club card skeleton */
export const ClubCardSkeleton: React.FC = () => (
  <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-beige)]" />
      <div className="flex-1 space-y-1.5">
        <div className="w-2/3 h-4 bg-[var(--bg-beige)] rounded-md" />
        <div className="w-1/2 h-3 bg-[var(--bg-beige)] rounded-full" />
      </div>
    </div>
    <div className="w-full h-3 bg-[var(--bg-beige)] rounded-full" />
    <div className="w-4/5 h-3 bg-[var(--bg-beige)] rounded-full" />
    <div className="flex gap-2 pt-1">
      <div className="w-20 h-7 bg-[var(--bg-beige)] rounded-full" />
      <div className="w-16 h-7 bg-[var(--bg-beige)] rounded-full" />
    </div>
  </div>
);

/** Achievement row skeleton */
export const AchievementSkeleton: React.FC = () => (
  <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-beige)] flex-shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="w-1/2 h-4 bg-[var(--bg-beige)] rounded-md" />
      <div className="w-3/4 h-2.5 bg-[var(--bg-beige)] rounded-full" />
      <div className="w-full h-1.5 bg-[var(--bg-beige)] rounded-full" />
    </div>
    <div className="w-12 h-5 bg-[var(--bg-beige)] rounded-full flex-shrink-0" />
  </div>
);

/** Collection card skeleton */
export const CollectionCardSkeleton: React.FC = () => (
  <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 animate-pulse space-y-3">
    <div className="flex gap-2">
      <div className="w-16 h-20 rounded-lg bg-[var(--bg-beige)]" />
      <div className="w-12 h-20 rounded-lg bg-[var(--bg-beige)] opacity-70" />
    </div>
    <div className="w-2/3 h-4 bg-[var(--bg-beige)] rounded-md" />
    <div className="w-1/2 h-2.5 bg-[var(--bg-beige)] rounded-full" />
  </div>
);
