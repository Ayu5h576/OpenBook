import React, { useState, useContext } from 'react';
import { ViewMode } from '../types';
import { BookOpen, ArrowLeft, Check, X, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface AuthViewProps {
  onNavigate: (view: ViewMode) => void;
  onLoginSuccess: () => void;
}

// Per-field validation helpers
function validateUsername(v: string): string | null {
  if (v.length < 3 || v.length > 30) return 'Must be 3–30 characters';
  if (!/^[a-zA-Z0-9_-]+$/.test(v)) return 'Letters, numbers, _ and - only';
  return null;
}

function validateEmail(v: string): string | null {
  if (!v) return 'Required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email address';
  return null;
}

const pwRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

function validatePassword(v: string): string | null {
  if (pwRules.every((r) => r.test(v))) return null;
  return 'Password does not meet requirements';
}

type FieldStatus = 'idle' | 'valid' | 'invalid';

function fieldStatus(touched: boolean, error: string | null): FieldStatus {
  if (!touched) return 'idle';
  return error ? 'invalid' : 'valid';
}

function inputBorder(status: FieldStatus) {
  if (status === 'valid') return 'border-[#22863a]';
  if (status === 'invalid') return 'border-[#C53030]';
  return 'border-[var(--border-light)]';
}

function FieldIcon({ status }: { status: FieldStatus }) {
  if (status === 'valid') return <Check className="w-4 h-4 text-[#22863a]" />;
  if (status === 'invalid') return <X className="w-4 h-4 text-[#C53030]" />;
  return null;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthContext not found');

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');

<<<<<<< HEAD
  // Track which fields the user has interacted with
  const [touched, setTouched] = useState({ username: false, email: false, password: false });

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const usernameError = validateUsername(username);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  const usernameStatus = fieldStatus(touched.username, usernameError);
  const emailStatus = fieldStatus(touched.email, emailError);
  const passwordStatus = fieldStatus(touched.password, passwordError);
=======
  // Mirrors the server-side rules in src/server/validators/auth.ts so the user
  // gets the specific reason before a round trip.
  const validateSignup = (): string | null => {
    if (username.length < 3 || username.length > 30) {
      return 'Username must be between 3 and 30 characters.';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores and hyphens (no spaces).';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must contain an uppercase letter, a lowercase letter and a number.';
    }
    return null;
  };
>>>>>>> ed6b0cd (your commit message)

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next);
    setLocalError('');
<<<<<<< HEAD
    setTouched({ username: false, email: false, password: false });
=======
>>>>>>> ed6b0cd (your commit message)
    auth.clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    auth.clearError();

    try {
      if (mode === 'login') {
        await auth.login(email, password);
      } else if (mode === 'signup') {
<<<<<<< HEAD
        if (usernameError || emailError || passwordError) {
          setTouched({ username: true, email: true, password: true });
=======
        const validationError = validateSignup();
        if (validationError) {
          setLocalError(validationError);
>>>>>>> ed6b0cd (your commit message)
          return;
        }
        await auth.register(email, username.trim(), password);
      } else {
        return;
      }
      onLoginSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-ivory)] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-[var(--white)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-warm-lg grid grid-cols-1 md:grid-cols-12">

        {/* Left panel */}
        <div className="md:col-span-5 bg-[var(--ink)] text-[var(--bg-ivory)] p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 text-xs text-[#A0A0A0] hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>

            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-ivory)] text-[var(--ink)] flex items-center justify-center mb-6 shadow-warm-md">
              <BookOpen className="w-5 h-5" />
            </div>

            <h2 className="font-serif-title text-3xl font-bold mb-3">Welcome to OpenBook</h2>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Your personal sanctuary for quiet reading, 3D bookshelf curation, and literary reflection.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-[#333333]">
            <p className="font-serif-title italic text-sm text-[#E0A96D]">
              "Reading is a discount ticket to everywhere."
            </p>
            <span className="text-[10px] text-[#A0A0A0] block mt-1">— Mary Schmich</span>
          </div>
        </div>

        {/* Right form area */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">

          <div className="mb-6">
            <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)]">
              {mode === 'login' && 'Sign in to your Library'}
              {mode === 'signup' && 'Create your Reader Profile'}
              {mode === 'forgot' && 'Reset your Password'}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              {mode === 'login' && 'Enter your credentials to access your personal shelf.'}
              {mode === 'signup' && 'Join thousands of bibliophiles in an elegant digital sanctuary.'}
              {mode === 'forgot' && 'Enter your registered email to receive a recovery link.'}
            </p>
          </div>

          {(localError || auth.error) && (
            <div className="mb-6 p-3 rounded-2xl bg-[#FEE5E5] border border-[#C53030] flex gap-3">
<<<<<<< HEAD
              <AlertCircle className="w-4 h-4 text-[#C53030] shrink-0 mt-0.5" />
=======
              <AlertCircle className="w-4 h-4 text-[#C53030] flex-shrink-0 mt-0.5" />
>>>>>>> ed6b0cd (your commit message)
              <p className="text-xs text-[#C53030] whitespace-pre-line">{localError || auth.error}</p>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['Google', 'GitHub', 'Apple'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={auth.isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[var(--border-light)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--bg-ivory)] transition-all disabled:opacity-50"
                >
                  {provider}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-center my-4">
            <div className="grow border-t border-[var(--border-light)]" />
            <span className="shrink mx-3 text-[11px] text-[var(--muted)] uppercase font-semibold">Or with Email</span>
            <div className="grow border-t border-[var(--border-light)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username — signup only */}
            {mode === 'signup' && (
              <div>
<<<<<<< HEAD
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1">Username</label>
=======
                <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">Username</label>
>>>>>>> ed6b0cd (your commit message)
                <div className="relative">
                  <User className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
<<<<<<< HEAD
=======
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_-]+"
>>>>>>> ed6b0cd (your commit message)
                    autoComplete="username"
                    placeholder="astrid_lindgren"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
<<<<<<< HEAD
                    onBlur={() => touch('username')}
                    className={`w-full bg-[var(--bg-ivory)] border ${inputBorder(usernameStatus)} rounded-2xl pl-10 pr-9 py-2.5 text-sm text-[var(--ink)] focus:outline-none transition-colors`}
=======
                    className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
>>>>>>> ed6b0cd (your commit message)
                  />
                  {usernameStatus !== 'idle' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FieldIcon status={usernameStatus} />
                    </span>
                  )}
                </div>
<<<<<<< HEAD
                {usernameStatus === 'invalid' ? (
                  <p className="text-[10px] text-[#C53030] mt-1">{usernameError}</p>
                ) : (
                  <p className="text-[10px] text-[var(--muted)] mt-1">3–30 chars. Letters, numbers, _ and - only.</p>
                )}
=======
                <p className="text-[10px] text-[#777777] mt-1">
                  3-30 characters. Letters, numbers, underscores and hyphens only - no spaces.
                </p>
>>>>>>> ed6b0cd (your commit message)
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="astrid@openbook.library"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch('email')}
                  className={`w-full bg-[var(--bg-ivory)] border ${mode === 'signup' ? inputBorder(emailStatus) : 'border-[var(--border-light)] focus:border-[var(--ink)]'} rounded-2xl pl-10 pr-9 py-2.5 text-sm text-[var(--ink)] focus:outline-none transition-colors`}
                />
                {mode === 'signup' && emailStatus !== 'idle' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <FieldIcon status={emailStatus} />
                  </span>
                )}
              </div>
              {mode === 'signup' && emailStatus === 'invalid' && (
                <p className="text-[10px] text-[#C53030] mt-1">{emailError}</p>
              )}
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => touch('password')}
                    className={`w-full bg-[var(--bg-ivory)] border ${mode === 'signup' ? inputBorder(passwordStatus) : 'border-[var(--border-light)] focus:border-[var(--ink)]'} rounded-2xl pl-10 pr-9 py-2.5 text-sm text-[var(--ink)] focus:outline-none transition-colors`}
                  />
                  {mode === 'signup' && passwordStatus !== 'idle' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FieldIcon status={passwordStatus} />
                    </span>
                  )}
                </div>
<<<<<<< HEAD

                {/* Live password rules checklist — only in signup, once user starts typing */}
                {mode === 'signup' && touched.password && (
                  <ul className="mt-2 space-y-1">
                    {pwRules.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <li key={rule.label} className={`flex items-center gap-1.5 text-[10px] ${ok ? 'text-[#22863a]' : 'text-[#C53030]'}`}>
                          {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
=======
                {mode === 'signup' && (
                  <p className="text-[10px] text-[#777777] mt-1">
                    At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                  </p>
>>>>>>> ed6b0cd (your commit message)
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={auth.isLoading}
              className="w-full py-3 rounded-2xl bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-xs hover:bg-[#333333] transition-all shadow-warm-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {auth.isLoading ? 'Loading...' : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Free Account'}
                  {mode === 'forgot' && 'Send Recovery Email'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--muted)]">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
<<<<<<< HEAD
                <button onClick={() => switchMode('signup')} className="font-bold text-[var(--ink)] underline">
=======
                <button onClick={() => switchMode('signup')} className="font-bold text-[#1D1D1D] underline">
>>>>>>> ed6b0cd (your commit message)
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
<<<<<<< HEAD
                <button onClick={() => switchMode('login')} className="font-bold text-[var(--ink)] underline">
=======
                <button onClick={() => switchMode('login')} className="font-bold text-[#1D1D1D] underline">
>>>>>>> ed6b0cd (your commit message)
                  Sign in
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
