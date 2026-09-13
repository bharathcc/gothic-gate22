import React from 'react';
import { ArrowLeft, Castle, Sparkles, ScrollText, Flame, User, CheckCircle2 } from 'lucide-react';
import { QuestionAnswerRecord, VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface SecondPagePreviewProps {
  user: VisitorUser;
  gateAnswerRecord?: QuestionAnswerRecord;
  sessionId: string;
  onReturnToEntrance: () => void;
}

export const SecondPagePreview: React.FC<SecondPagePreviewProps> = ({
  user,
  gateAnswerRecord,
  onReturnToEntrance,
}) => {
  const handleReturn = () => {
    soundEngine.playHoverTone();
    onReturnToEntrance();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8 text-slate-200 bg-[#020509] overflow-x-hidden select-none">
      {/* Subtle Castle Hall Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,45,75,0.45)_0%,rgba(2,5,9,0.95)_75%)] pointer-events-none" />

      {/* Flickering Torches along the hall walls */}
      <div className="absolute top-12 left-6 sm:left-20 flex flex-col items-center opacity-70 pointer-events-none">
        <Flame className="w-6 h-6 text-amber-500 animate-pulse drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
        <div className="w-2 h-16 bg-gradient-to-b from-amber-900 to-transparent rounded-full" />
      </div>
      <div className="absolute top-12 right-6 sm:right-20 flex flex-col items-center opacity-70 pointer-events-none">
        <Flame className="w-6 h-6 text-amber-500 animate-pulse drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
        <div className="w-2 h-16 bg-gradient-to-b from-amber-900 to-transparent rounded-full" />
      </div>

      {/* Top Bar with Castle Breadcrumb & Visitor Tag */}
      <header className="relative z-20 w-full max-w-4xl flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Castle className="w-5 h-5 text-cyan-400" />
          <span className="font-cinzel tracking-[0.25em] text-xs uppercase text-slate-300">
            Inner Castle Sanctum
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-cinzel text-cyan-300">
            <User className="w-3.5 h-3.5" />
            <span>{user.name}</span>
          </div>

          <button
            type="button"
            onClick={handleReturn}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Gates</span>
          </button>
        </div>
      </header>

      {/* Center Grand Castle Sanctuary */}
      <main className="relative z-10 w-full max-w-2xl text-center my-auto py-12 px-6 sm:px-10 rounded-2xl gothic-glass border border-cyan-500/30 shadow-[0_0_50px_rgba(56,189,248,0.2)] bg-[#070b14]/90 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-tr from-cyan-950 to-slate-900 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.3)]">
          <ScrollText className="w-8 h-8 text-cyan-300" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-cinzel-decorative font-bold text-white tracking-widest mb-3 drop-shadow-[0_2px_15px_rgba(56,189,248,0.4)]">
          The Grand Castle Hall
        </h1>

        <p className="font-cormorant text-lg sm:text-2xl text-slate-300 italic leading-relaxed mb-6">
          "Welcome across the threshold, <span className="text-cyan-300 font-semibold">{user.name}</span>. The heavy stone doors have unsealed. You have spoken the name of power to the master of shadows."
        </p>

        {gateAnswerRecord && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left">
            <div className="flex items-center gap-2 text-xs font-cinzel text-cyan-300 uppercase tracking-wider font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Gate Entrance Answer Verified</span>
            </div>
            <p className="text-sm font-cormorant italic text-slate-200">
              "{gateAnswerRecord.answer}"
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleReturn}
            className="px-6 py-3 rounded-lg gothic-btn text-cyan-100 font-cinzel text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Re-test Gate Entrance</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-slate-600 font-cinzel text-[11px] tracking-widest pt-4">
        Gothic Cinematic Experience &bull; Inner Sanctum
      </footer>
    </div>
  );
};
