import React from 'react';

export const BookCardSkeleton: React.FC<{ layout?: 'grid' | 'horizontal' }> = ({ layout = 'grid' }) => {
  if (layout === 'horizontal') {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-4 flex items-center gap-4 animate-pulse">
        <div className="w-16 h-24 rounded-lg bg-[#EFE8DD] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-20 h-2.5 bg-[#EFE8DD] rounded-full" />
          <div className="w-3/4 h-4 bg-[#EFE8DD] rounded-md" />
          <div className="w-1/2 h-3 bg-[#EFE8DD] rounded-md" />
          <div className="w-full h-1.5 bg-[#EFE8DD] rounded-full mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-4 flex flex-col justify-between animate-pulse">
      <div>
        <div className="aspect-[2/3] w-full rounded-2xl bg-[#EFE8DD] mb-4" />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-16 h-2.5 bg-[#EFE8DD] rounded-full" />
            <div className="w-10 h-3 bg-[#EFE8DD] rounded-full" />
          </div>
          <div className="w-full h-5 bg-[#EFE8DD] rounded-md" />
          <div className="w-2/3 h-3 bg-[#EFE8DD] rounded-md" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between">
        <div className="w-16 h-3 bg-[#EFE8DD] rounded-full" />
        <div className="w-20 h-3 bg-[#EFE8DD] rounded-full" />
      </div>
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md animate-pulse flex flex-col md:flex-row items-center gap-8">
      <div className="w-40 sm:w-48 h-60 sm:h-72 rounded-2xl bg-[#EFE8DD] flex-shrink-0" />
      <div className="flex-1 space-y-4 w-full">
        <div className="w-36 h-6 bg-[#EFE8DD] rounded-full" />
        <div className="space-y-2">
          <div className="w-3/4 h-8 bg-[#EFE8DD] rounded-lg" />
          <div className="w-1/2 h-4 bg-[#EFE8DD] rounded-md" />
        </div>
        <div className="w-full h-12 bg-[#EFE8DD] rounded-xl" />
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <div className="w-24 h-3 bg-[#EFE8DD] rounded-full" />
            <div className="w-20 h-3 bg-[#EFE8DD] rounded-full" />
          </div>
          <div className="w-full h-2.5 bg-[#EFE8DD] rounded-full" />
        </div>
        <div className="pt-2 flex gap-4">
          <div className="w-36 h-10 bg-[#EFE8DD] rounded-full" />
          <div className="w-28 h-10 bg-[#EFE8DD] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const BookDetailSkeleton: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-lg animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
      <div className="lg:col-span-4 flex flex-col items-center">
        <div className="w-56 sm:w-64 h-80 sm:h-96 rounded-2xl bg-[#EFE8DD]" />
        <div className="flex gap-3 mt-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE8DD]" />
          <div className="w-12 h-12 rounded-2xl bg-[#EFE8DD]" />
          <div className="w-12 h-12 rounded-2xl bg-[#EFE8DD]" />
        </div>
      </div>
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="w-20 h-5 bg-[#EFE8DD] rounded-full" />
            <div className="w-24 h-5 bg-[#EFE8DD] rounded-full" />
          </div>
          <div className="w-3/4 h-10 bg-[#EFE8DD] rounded-lg" />
          <div className="w-1/3 h-5 bg-[#EFE8DD] rounded-md" />
          <div className="w-48 h-6 bg-[#EFE8DD] rounded-full my-4" />
          <div className="space-y-2">
            <div className="w-full h-4 bg-[#EFE8DD] rounded-md" />
            <div className="w-full h-4 bg-[#EFE8DD] rounded-md" />
            <div className="w-2/3 h-4 bg-[#EFE8DD] rounded-md" />
          </div>
        </div>
        <div className="flex gap-4 pt-4 border-t border-[#E5E0D8]">
          <div className="w-32 h-12 bg-[#EFE8DD] rounded-full" />
          <div className="w-32 h-12 bg-[#EFE8DD] rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8F6F1] rounded-2xl border border-[#E5E0D8]">
          <div className="w-full h-8 bg-[#EFE8DD] rounded-md" />
          <div className="w-full h-8 bg-[#EFE8DD] rounded-md" />
          <div className="w-full h-8 bg-[#EFE8DD] rounded-md" />
          <div className="w-full h-8 bg-[#EFE8DD] rounded-md" />
        </div>
      </div>
    </div>
  );
};
