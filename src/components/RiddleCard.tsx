import React, { useState } from 'react';
import { HelpCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { RiddleConfig } from '../config/riddleConfig';
import { VoiceInput } from './VoiceInput';
import { soundEngine } from '../utils/soundEngine';

interface RiddleCardProps {
  config: RiddleConfig;
  onValidateAnswer: (answer: string, details?: { method?: 'voice' | 'typed'; audioBase64?: string; audioMimeType?: string }) => void;
  isProcessing: boolean;
  isSuccess: boolean;
  rejectionMessage: string | null;
  shakeTrigger: number;
  onSingingChange?: (isSinging: boolean) => void;
}

export const RiddleCard: React.FC<RiddleCardProps> = ({
  config,
  onValidateAnswer,
  isProcessing,
  isSuccess,
  rejectionMessage,
  shakeTrigger,
  onSingingChange,
}) => {
  const [isHintRevealed, setIsHintRevealed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleHint = () => {
    soundEngine.playHoverTone();
    setIsHintRevealed(!isHintRevealed);
  };

  const showHintText = isHintRevealed || isHovered;

  return (
    <div
      id="gothic-riddle-panel"
      className={`relative w-full max-w-sm sm:max-w-md mx-auto px-5 py-6 sm:px-7 sm:py-7 rounded-2xl gothic-glass transition-all duration-300 select-none ${
        rejectionMessage
          ? 'border-red-900/80 shadow-[0_0_35px_rgba(185,28,28,0.35)] bg-black/75'
          : isSuccess
          ? 'border-cyan-300 shadow-[0_0_45px_rgba(56,189,248,0.6)] bg-black/80'
          : 'bg-black/60'
      }`}
      style={{
        animation: shakeTrigger > 0 ? 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both' : undefined,
      }}
    >
      {/* Gothic Filigree Corner Accents */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-cyan-400/40 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-cyan-400/40 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-cyan-400/40 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-cyan-400/40 rounded-br-sm pointer-events-none" />

      {/* Decorative Gothic Top Crest */}
      <div className="flex items-center justify-center gap-2 mb-2 opacity-75">
        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <span className="text-cyan-300 text-[10px] tracking-widest font-cinzel">✦ ❖ ✦</span>
        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      </div>

      {/* 1. Mysterious Challenge Intro Header */}
      <div className="text-center mb-1">
        <h2 className="text-[11px] sm:text-xs font-cinzel tracking-[0.25em] text-cyan-300/80 uppercase font-semibold">
          {config.introText}
        </h2>
      </div>

      {/* 2. The Prominent Center Question */}
      <div className="text-center my-3 px-1">
        <h1 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-slate-100 tracking-wider drop-shadow-[0_2px_12px_rgba(56,189,248,0.35)]">
          "{config.question}"
        </h1>
      </div>

      {/* 3. Subtle Understated Hint ("Hint" on click/hover reveals "Rebel Star — Movie Song — 2007") */}
      <div className="flex flex-col items-center justify-center mt-1 mb-2">
        <button
          type="button"
          onClick={toggleHint}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Reveal hint"
          className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-cinzel tracking-widest text-slate-400 hover:text-cyan-300 bg-slate-950/60 hover:bg-slate-900 border border-slate-700/60 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer shadow-sm"
        >
          <HelpCircle className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 transition-colors" />
          <span>Hint</span>
          {showHintText ? (
            <EyeOff className="w-2.5 h-2.5 text-slate-400" />
          ) : (
            <Eye className="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400" />
          )}
        </button>

        {showHintText && (
          <div className="mt-2 px-3 py-1.5 rounded-md bg-black/75 border border-cyan-900/60 text-center animate-fadeIn max-w-xs shadow-inner">
            <p className="text-xs font-cormorant italic text-cyan-200/90 tracking-wide font-medium">
              {config.hint}
            </p>
          </div>
        )}
      </div>

      {/* 4. Rejection / Sealed Warning Feedback */}
      {rejectionMessage && (
        <div
          id="rejection-message-banner"
          className="mt-2 px-3.5 py-2 rounded-lg bg-red-950/80 border border-red-800/80 text-red-200 text-center flex items-center justify-center gap-2 animate-bounce [animation-iteration-count:2]"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="font-cormorant text-sm sm:text-base font-semibold tracking-wide">
            {rejectionMessage}
          </span>
        </div>
      )}

      {/* 5. The Cinematic Voice-Answer Architecture */}
      <VoiceInput
        onSubmitAnswer={onValidateAnswer}
        isSuccess={isSuccess}
        isProcessing={isProcessing}
        onSingingChange={onSingingChange}
      />
    </div>
  );
};
