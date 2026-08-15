import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, type ToastItem, type ToastVariant } from '../context/ToastContext';

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; bg: string; border: string; text: string; bar: string }
> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
    bg: 'bg-[#F0FDF4]',
    border: 'border-[#86EFAC]',
    text: 'text-[#15803D]',
    bar: 'bg-[#22C55E]',
  },
  error: {
    icon: <XCircle className="w-4 h-4 flex-shrink-0" />,
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FCA5A5]',
    text: 'text-[#DC2626]',
    bar: 'bg-[#EF4444]',
  },
  info: {
    icon: <Info className="w-4 h-4 flex-shrink-0" />,
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#93C5FD]',
    text: 'text-[#1D4ED8]',
    bar: 'bg-[#3B82F6]',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FCD34D]',
    text: 'text-[#B45309]',
    bar: 'bg-[#F59E0B]',
  },
};

const ToastCard: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const { remove } = useToast();
  const cfg = variantConfig[toast.variant];
  const duration = toast.duration ?? 4000;

  return (
    <div
      className={`
        relative flex items-start gap-3 w-80 rounded-2xl border px-4 py-3 shadow-warm-md
        ${cfg.bg} ${cfg.border} ${cfg.text}
        animate-toast-in
      `}
      role="alert"
    >
      {cfg.icon}
      <p className="text-xs font-semibold flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={() => remove(toast.id)}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${cfg.bar} animate-toast-bar`}
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
};

export const ToastStack: React.FC = () => {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
};
