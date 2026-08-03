import React, { useState } from 'react';
import { Settings, User, Bell, Lock, Palette, Shield, Laptop, Moon } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [theme, setTheme] = useState('ivory');
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Preferences & Account</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Settings</h1>
          <p className="text-xs text-[#777777] mt-1">Configure your reading preferences, display themes, and account security.</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm space-y-4">
        <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">Reader Profile</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-xl">
            AL
          </div>
          <div>
            <h4 className="font-bold text-[#1D1D1D]">Astrid Lindgren</h4>
            <p className="text-xs text-[#777777]">astrid@openbook.library • Premium Bibliophile Pass</p>
          </div>
        </div>
      </div>

      {/* Reading Experience Preferences */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm space-y-6">
        <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">Reading Environment</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm text-[#1D1D1D] block">Default App Palette</span>
            <span className="text-xs text-[#777777]">Scandinavian Warm Ivory (#F8F6F1)</span>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-xl px-4 py-2 text-xs font-semibold text-[#1D1D1D]"
          >
            <option value="ivory">Warm Ivory (#F8F6F1)</option>
            <option value="beige">Soft Beige (#EFE8DD)</option>
            <option value="dark">Charcoal Twilight (#1D1D1D)</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E5E0D8]">
          <div>
            <span className="font-bold text-sm text-[#1D1D1D] block">Daily Goal Reminders</span>
            <span className="text-xs text-[#777777]">Gentle notification when evening reading window opens</span>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[#1D1D1D]' : 'bg-[#E5E0D8]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notifications ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E5E0D8]">
          <div>
            <span className="font-bold text-sm text-[#1D1D1D] block">Cloud Progress Sync</span>
            <span className="text-xs text-[#777777]">Sync bookmarks and last read page across all e-readers</span>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`w-12 h-6 rounded-full transition-colors relative ${autoSync ? 'bg-[#1D1D1D]' : 'bg-[#E5E0D8]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${autoSync ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

    </div>
  );
};
