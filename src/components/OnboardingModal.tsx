import React, { useState } from 'react';
import { BookOpen, Sparkles, Compass, X, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  username?: string;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

const STEPS = [
  {
    icon: <BookOpen className="w-10 h-10" />,
    iconBg: 'bg-[var(--bg-beige)]',
    iconColor: 'text-[#A0522D]',
    title: 'Welcome to OpenBook',
    subtitle: 'Your personal AI-powered reading companion',
    body: 'OpenBook transforms how you discover, read, and connect with books. Immersive 3D bookshelves, AI recommendations, community clubs, and reading analytics — all in one place.',
    cta: 'Next',
  },
  {
    icon: <Sparkles className="w-10 h-10" />,
    iconBg: 'bg-[#FFFBEB]',
    iconColor: 'text-[#B45309]',
    title: 'Build your library',
    subtitle: 'Search millions of books and make them yours',
    body: 'Use the Explore tab to search Google Books and import any title directly to your personal library. Track reading progress, write reviews, highlight passages, and take notes.',
    cta: 'Next',
  },
  {
    icon: <Compass className="w-10 h-10" />,
    iconBg: 'bg-[#EFF6FF]',
    iconColor: 'text-[#2563EB]',
    title: 'Let AI guide your next read',
    subtitle: 'Personalized picks grounded in your actual history',
    body: 'The Reading Compass analyses your library, reviews, sessions, and goals to suggest the perfect next book — with explicit reasoning so you always know why it\'s right for you.',
    cta: 'Get Started',
  },
];

const STORAGE_KEY = 'openbook_onboarded';

export function markOnboarded() {
  localStorage.setItem(STORAGE_KEY, '1');
}

export function isOnboarded() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  username,
  onClose,
  onNavigate,
}) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboarded();
      onClose();
      onNavigate('explore');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboarded();
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[var(--ink)]/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
    >
      {/* Card */}
      <div
        key={step}
        className="relative w-full max-w-md bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 shadow-warm-lg animate-scale-in"
      >
        {/* Skip */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--muted)] hover:bg-[var(--bg-beige)] hover:text-[var(--ink)] transition-all"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-3xl ${current.iconBg} ${current.iconColor} flex items-center justify-center mb-6 animate-float shadow-warm-sm`}
        >
          {current.icon}
        </div>

        {/* Greeting (first step only) */}
        {step === 0 && username && (
          <p className="text-xs font-semibold text-[#A0522D] uppercase tracking-widest mb-1">
            Hey, {username} 👋
          </p>
        )}

        <h2 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-1">
          {current.title}
        </h2>
        <p className="text-xs font-semibold text-[var(--muted)] mb-4">{current.subtitle}</p>
        <p className="text-sm text-[#555555] leading-relaxed mb-8">{current.body}</p>

        {/* Dot indicators */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[var(--ink)]' : 'w-2 bg-[var(--border-light)] hover:bg-[#CFC8BC]'
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] transition-all active:scale-95 shadow-warm-sm"
          >
            {isLast ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{current.cta}</span>
            {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
