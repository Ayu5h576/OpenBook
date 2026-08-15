import React, { useState, useContext } from 'react';
import { Settings, User, Bell, Lock, Shield, Palette, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { AuthService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';
import { ErrorBanner } from '../components/ErrorBanner';

export const SettingsView: React.FC = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  // Profile form state
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const toast = useToast();
  const { theme, setTheme } = useTheme();

  // Notifications preference (local)
  const [notifications, setNotifications] = useState(true);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError('');
    try {
      await auth?.updateProfile({ username, bio } as any);
      toast.success('Profile saved!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setIsSavingPassword(true);
    setPasswordError('');
    try {
      const res = await AuthService.changePassword(newPassword, confirmPassword);
      if (res.error) {
        setPasswordError(res.error);
      } else {
        toast.success('Password updated!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth?.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      
      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Preferences & Account</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Settings</h1>
          <p className="text-xs text-[var(--muted)] mt-1">Configure your reading preferences, display themes, and account security.</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <User className="w-5 h-5 text-[#A0522D]" />
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Reader Profile</h3>
        </div>
        
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-light)]">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--ink)] text-white flex items-center justify-center font-bold text-xl">
              {(user?.username ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="font-bold text-[var(--ink)]">{user?.username ?? 'Reader'}</h4>
            <p className="text-xs text-[var(--muted)]">{user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us about your reading habits..."
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all resize-none"
            />
          </div>

          {profileError && <ErrorBanner message={profileError} />}

          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ink)] text-white text-xs font-bold hover:bg-[#333] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSavingProfile
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Reading Experience Preferences */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <Palette className="w-5 h-5 text-[#A0522D]" />
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Reading Environment</h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-xs text-[var(--muted)]">Choose your preferred reading environment palette.</p>
          <div className="flex gap-3 flex-wrap">
            {([
              { id: 'light', label: 'Warm Ivory', swatch: '#F8F6F1', border: '#E5E0D8' },
              { id: 'sepia', label: 'Sepia',      swatch: '#F4ECD8', border: '#D9C5A0' },
              { id: 'dark',  label: 'Dark',       swatch: '#181818', border: '#333333' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  theme === t.id
                    ? 'border-[var(--ink)] ring-1 ring-[var(--ink)]'
                    : 'border-[var(--border-light)] hover:border-[var(--ink)]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border"
                  style={{ background: t.swatch, borderColor: t.border }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
          <div>
            <span className="font-bold text-sm text-[var(--ink)] block">Daily Goal Reminders</span>
            <span className="text-xs text-[var(--muted)]">Gentle notification when evening reading window opens</span>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[var(--ink)]' : 'bg-[var(--border-light)]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notifications ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <Lock className="w-5 h-5 text-[#A0522D]" />
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Security</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all"
            />
          </div>

          {passwordError && <ErrorBanner message={passwordError} />}

          <button
            onClick={handleChangePassword}
            disabled={isSavingPassword || !newPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ink)] text-white text-xs font-bold hover:bg-[#333] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSavingPassword
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Shield className="w-3.5 h-3.5" />}
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--white)] border border-red-200 rounded-3xl p-6 shadow-warm-sm space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-serif-title text-2xl font-bold text-red-700">Danger Zone</h3>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Logging out will clear your session. You can always log back in with your credentials.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:bg-red-100 transition-all"
        >
          <span>Logout from OpenBook</span>
        </button>
      </div>

    </div>
  );
};
