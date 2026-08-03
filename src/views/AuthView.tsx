import React, { useState } from 'react';
import { ViewMode } from '../types';
import { BookOpen, ArrowLeft, Shield, Check, Lock, Mail, User } from 'lucide-react';

interface AuthViewProps {
  onNavigate: (view: ViewMode) => void;
  onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
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

          {/* Single-Click Social Logins */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                type="button"
                onClick={onLoginSuccess}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all"
              >
                Google
              </button>
              <button
                type="button"
                onClick={onLoginSuccess}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all"
              >
                GitHub
              </button>
              <button
                type="button"
                onClick={onLoginSuccess}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all"
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
                <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Astrid Lindgren"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
                  />
                </div>
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
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#1D1D1D] text-[#F8F6F1] font-bold text-xs hover:bg-[#333333] transition-all shadow-warm-md"
            >
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Free Account'}
              {mode === 'forgot' && 'Send Recovery Email'}
            </button>
          </form>

          {/* Toggle mode links */}
          <div className="mt-6 text-center text-xs text-[#777777]">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-bold text-[#1D1D1D] underline">
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-bold text-[#1D1D1D] underline">
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
