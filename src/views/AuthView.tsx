import React, { useState, useContext } from 'react';
import { ViewMode } from '../types';
import { BookOpen, ArrowLeft, Shield, Check, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface AuthViewProps {
  onNavigate: (view: ViewMode) => void;
  onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthContext not found');

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');

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

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next);
    setLocalError('');
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
        const validationError = validateSignup();
        if (validationError) {
          setLocalError(validationError);
          return;
        }
        await auth.register(email, username.trim(), password);
      } else {
        return;
      }
      onLoginSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setLocalError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl overflow-hidden shadow-warm-lg grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Illustration & Quote Panel */}
        <div className="md:col-span-5 bg-[#1D1D1D] text-[#F8F6F1] p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 text-xs text-[#A0A0A0] hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>

            <div className="w-10 h-10 rounded-2xl bg-[#F8F6F1] text-[#1D1D1D] flex items-center justify-center mb-6 shadow-warm-md">
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

        {/* Right Form Area */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          
          <div className="mb-6">
            <h3 className="font-serif-title text-3xl font-bold text-[#1D1D1D]">
              {mode === 'login' && 'Sign in to your Library'}
              {mode === 'signup' && 'Create your Reader Profile'}
              {mode === 'forgot' && 'Reset your Password'}
            </h3>
            <p className="text-xs text-[#777777] mt-1">
              {mode === 'login' && 'Enter your credentials to access your personal shelf.'}
              {mode === 'signup' && 'Join thousands of bibliophiles in an elegant digital sanctuary.'}
              {mode === 'forgot' && 'Enter your registered email to receive a recovery link.'}
            </p>
          </div>

          {/* Error Message */}
          {(localError || auth.error) && (
            <div className="mb-6 p-3 rounded-2xl bg-[#FEE5E5] border border-[#C53030] flex gap-3">
              <AlertCircle className="w-4 h-4 text-[#C53030] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#C53030] whitespace-pre-line">{localError || auth.error}</p>
            </div>
          )}

          {/* Single-Click Social Logins */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                type="button"
                disabled={auth.isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all disabled:opacity-50"
              >
                Google
              </button>
              <button
                type="button"
                disabled={auth.isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all disabled:opacity-50"
              >
                GitHub
              </button>
              <button
                type="button"
                disabled={auth.isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all disabled:opacity-50"
              >
                Apple
              </button>
            </div>
          )}

          <div className="relative flex items-center my-4">
            <div className="flex-grow border-t border-[#E5E0D8]" />
            <span className="flex-shrink mx-3 text-[11px] text-[#777777] uppercase font-semibold">Or with Email</span>
            <div className="flex-grow border-t border-[#E5E0D8]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_-]+"
                    autoComplete="username"
                    placeholder="astrid_lindgren"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
                  />
                </div>
                <p className="text-[10px] text-[#777777] mt-1">
                  3-30 characters. Letters, numbers, underscores and hyphens only - no spaces.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="astrid@openbook.library"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
                  />
                </div>
                {mode === 'signup' && (
                  <p className="text-[10px] text-[#777777] mt-1">
                    At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={auth.isLoading}
              className="w-full py-3 rounded-2xl bg-[#1D1D1D] text-[#F8F6F1] font-bold text-xs hover:bg-[#333333] transition-all shadow-warm-md disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Toggle mode links */}
          <div className="mt-6 text-center text-xs text-[#777777]">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} className="font-bold text-[#1D1D1D] underline">
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-bold text-[#1D1D1D] underline">
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
