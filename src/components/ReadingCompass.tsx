import React, { useState } from 'react';
import { Book } from '../types';
import { AIApiService, AIRecommendation } from '../services/api';
import { Sparkles, Compass, Heart, Loader2, ArrowRight } from 'lucide-react';

interface ReadingCompassProps {
  onSelectBook: (book: Book) => void;
  allBooks: Book[];
}

export const ReadingCompass: React.FC<ReadingCompassProps> = ({ onSelectBook, allBooks }) => {
  const [moodInput, setMoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [error, setError] = useState<string | null>(null);

  const quickMoodTags = [
    "Cozy rain-soaked library on an autumn afternoon",
    "Melancholic introspection & quiet solitude",
    "Intense intellectual dark academia mystery",
    "Inspiring architectural craftsmanship & timber design",
    "Peaceful Stoic clarity for an anxious mind"
  ];

  const handleSeekRecommendations = async (query: string) => {
    setLoading(true);
    setMoodInput(query);
    setError(null);
    try {
      const data = await AIApiService.getReadingCompass({
        limit: 5,
        genres: query.trim() ? [query.trim()] : undefined,
        useCache: false,
      });
      if (data.error) {
        setError(data.error);
      } else if (data.data) {
        setRecommendations(data.data.recommendations);
        setReasoning(data.data.reasoning);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to consult the reading compass.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#1D1D1D] text-[#F8F6F1] rounded-3xl p-6 md:p-10 shadow-warm-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#E0A96D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0A96D]/20 text-[#E0A96D] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Emotional Literature Compass</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold mb-2">Reading Compass</h2>
        <p className="text-sm text-[#A0A0A0]">
          Describe how you want to feel right now—not a category or author, but an atmosphere, an emotion, or a state of mind.
        </p>
      </div>

      {/* Prompt Input Bar */}
      <div className="mb-6 max-w-2xl">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. 'I want a cozy book with rain outside, warm coffee, and quiet mystery...'"
            value={moodInput}
            onChange={(e) => setMoodInput(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#E0A96D]"
          />
          <button
            onClick={() => handleSeekRecommendations(moodInput)}
            disabled={loading || !moodInput.trim()}
            className="px-6 py-3 rounded-2xl bg-[#E0A96D] text-[#1D1D1D] font-bold text-xs hover:bg-[#D49A5B] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
            <span>Consult AI</span>
          </button>
        </div>
      </div>

      {/* Quick Mood Preset Pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        {quickMoodTags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleSeekRecommendations(tag)}
            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#E0E1DD] hover:bg-white/15 transition-all text-left"
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Recommendations Cards */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif-title text-2xl font-bold text-[#E0A96D] mb-4">Curated Emotional Matches</h3>
          {reasoning && <p className="text-xs text-[#A0A0A0] max-w-3xl">{reasoning}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white/10 border border-white/15 rounded-2xl p-5 hover:border-[#E0A96D] transition-all">
                <span className="text-[10px] font-bold uppercase text-[#E0A96D] tracking-wider">{rec.categories?.[0] ?? 'Personalized'}</span>
                <h4 className="font-serif-title text-2xl font-bold text-white my-1">{rec.title}</h4>
                <p className="text-xs text-[#A0A0A0] mb-3">by {rec.authors.join(', ') || 'Unknown author'}</p>
                <p className="text-xs text-white/80 italic bg-black/20 p-3 rounded-xl border border-white/5">
                  "{rec.reasoning}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
