import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  className = '',
}) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] animate-fade-in ${className}`}
    role="alert"
  >
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <p className="text-xs font-semibold flex-1">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-bold underline underline-offset-2 hover:text-[#B91C1C] transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    )}
  </div>
);
