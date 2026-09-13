import React from 'react';
import { ArrowLeft, Castle, Sparkles, CheckCircle2, RotateCcw, User, Heart, Star } from 'lucide-react';
import { VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface ThirdPagePreviewProps {
  user: VisitorUser;
  onReturnToPuzzle: () => void;
  onReturnToEntrance: () => void;
}

export const ThirdPagePreview: React.FC<ThirdPagePreviewProps> = ({
  user,
  onReturnToPuzzle,
  onReturnToEntrance,
}) => {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 text-slate-200 bg-[#020509] overflow-x-hidden select-none">
      {/* Subtle Castle Hall Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,45,75,0.45)_0%,rgba(2,5,9,0.95)_75%)] pointer-events-none" />

      {/* Decorative star motes */}
      <div className="absolute top-1/4 left-1/6 w-1 h-1 bg-cyan-300 rounded-full animate-ping pointer-events-none" />
      <div className="absolute top-1/3 right-1/5 w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 w-full max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Castle className="w-5 h-5 text-cyan-400" />
          <span className="font-cinzel tracking-[0.25em] text-xs uppercase text-slate-300">
            Chapter III &bull; Inner Sanctum
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-xs font-cinzel text-cyan-300">
            <User className="w-3.5 h-3.5" />
            <span>{user.name}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playHoverTone();
              onReturnToPuzzle();
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Puzzle</span>
          </button>
        </div>
      </header>

      {/* Center Grand Sanctuary Card */}
      <main className="relative z-10 w-full max-w-2xl mx-auto text-center my-auto py-12 px-6 sm:px-10 rounded-2xl gothic-glass border border-cyan-500/40 shadow-[0_0_60px_rgba(56,189,248,0.25)] bg-[#070b14]/95 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-tr from-cyan-950 to-slate-900 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.4)] animate-bounce">
          <Sparkles className="w-8 h-8 text-cyan-300" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 text-xs font-cinzel tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Memory Reconstructed</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-cinzel-decorative font-bold text-white tracking-widest mb-3 drop-shadow-[0_2px_15px_rgba(56,189,248,0.5)]">
          The Inner Sanctum
        </h1>

        <p className="font-cormorant text-lg sm:text-2xl text-slate-300 italic leading-relaxed mb-6">
          "The fractured memory is restored, <span className="text-cyan-300 font-semibold">{user.name}</span>. The ancient portrait has revealed its true form, and the path deeper into the castle lies open."
        </p>

        {/* Full Restored Photograph Display */}
        <div className="relative mx-auto w-48 h-64 sm:w-56 sm:h-72 rounded-xl overflow-hidden border-2 border-cyan-400/70 shadow-[0_0_40px_rgba(56,189,248,0.4)] mb-8">
          <img
            src="/puzzle_photo.jpeg"
            alt="Restored Memory"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playHoverTone();
              onReturnToPuzzle();
            }}
            className="px-6 py-3 rounded-lg gothic-btn text-cyan-100 font-cinzel text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Puzzle Again</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playHoverTone();
              onReturnToEntrance();
            }}
            className="px-6 py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-cinzel text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Gates</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-slate-600 font-cinzel text-[11px] tracking-widest pt-4">
        Gothic Cinematic Experience &bull; Chapter III
      </footer>
    </div>
  );
};
