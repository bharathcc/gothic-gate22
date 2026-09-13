import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, RotateCcw, Volume2, VolumeX, ChevronLeft, Eye } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';
import { VisitorUser } from '../types';
import { InteractiveMemoryJourney } from './InteractiveMemoryJourney';
import { CakeCuttingChallenge } from './CakeCuttingChallenge';

interface FinalBirthdayPageProps {
  user?: VisitorUser;
  sessionId?: string;
  onReturnToEntrance?: () => void;
  onRestartQuiz?: () => void;
  onReturnToPreviousStage?: () => void;
}

export const FinalBirthdayPage: React.FC<FinalBirthdayPageProps> = ({
  user,
  sessionId,
  onReturnToEntrance,
  onRestartQuiz,
  onReturnToPreviousStage,
}) => {
  const [showHappyBirthday, setShowHappyBirthday] = useState(false);
  const [showDracula, setShowDracula] = useState(false);
  const [showSurprisePrompt, setShowSurprisePrompt] = useState(false);
  const [isMuted, setIsMuted] = useState(birthdayMusicPlayer.getIsMuted());
  const [hasOpened, setHasOpened] = useState(false);
  const [isCakeCutComplete, setIsCakeCutComplete] = useState(false);
  const hasStartedMusicRef = useRef(false);

  // Slow, grand, cinematic entrance sequence:
  useEffect(() => {
    // Attempt starting sweet birthday music immediately upon entering this page
    const tryPlayMusic = () => {
      if (!hasStartedMusicRef.current) {
        try {
          birthdayMusicPlayer.start();
          hasStartedMusicRef.current = true;
          setIsMuted(birthdayMusicPlayer.getIsMuted());
        } catch {
          // Will start on first tap
        }
      }
    };

    tryPlayMusic();

    // Register user gesture listener to bypass any browser audio autoplay restrictions
    const handleFirstGesture = () => {
      tryPlayMusic();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });

    // Slow, majestic, cinematic entrance sequence:
    // Phase 1 (1200ms): "HAPPY BIRTHDAY" gently unfolds with glowing letters (takes ~2.5s)
    const t1 = setTimeout(() => {
      setShowHappyBirthday(true);
    }, 1200);

    // Phase 2 (4000ms): "DRACULA" grandly glides in with royal sparkle luminance (takes ~3s)
    const t2 = setTimeout(() => {
      setShowDracula(true);
    }, 4000);

    // Phase 3 (7600ms): OPEN button is revealed ONLY AFTER "HAPPY BIRTHDAY DRACULA" completely finishes its animation
    const t3 = setTimeout(() => {
      setShowSurprisePrompt(true);
    }, 7600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  const toggleSound = () => {
    const muted = birthdayMusicPlayer.toggleMute();
    soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Called when cake cutting challenge successfully completes
  const handleCakeCutSuccess = () => {
    setIsCakeCutComplete(true);

    // Record final cake cut interaction
    if (sessionId) {
      void fetch('/api/visitor/record-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: 'page6_cake_cutting_celebration',
          questionNumber: 6,
          questionTitle: 'The Birthday Cake Slicing & Music Unlock',
          questionPrompt: "Complete the runaway OPEN button challenge and slice Dracula's birthday cake.",
          answer: 'Cake sliced with knife! Soft birthday melody & memory journey unlocked.',
          method: 'typed',
          isCorrect: true,
        }),
      }).then(() => {
        // Trigger complete dossier email dispatch to alert email!
        void fetch('/api/visitor/complete-quest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      });
    }

    // Keep sweet birthday music playing
    try {
      birthdayMusicPlayer.start();
      setIsMuted(birthdayMusicPlayer.getIsMuted());
    } catch {}

    setHasOpened(true);
  };

  return (
    <div
      id="birthday-final-page"
      className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden flex flex-col items-center justify-between select-none"
      style={{
        background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 35%, #ffe4e6 70%, #fdf2f8 100%)',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. SOFT BOKEH LIGHT SPOTS & GENTLE AMBIENT GLOW */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Soft Warm Radial Ambient Center Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[540px] md:w-[720px] h-[320px] sm:h-[540px] md:h-[720px] rounded-full blur-3xl opacity-75 pointer-events-none transition-all duration-1000"
          style={{
            background: 'radial-gradient(circle, rgba(254, 205, 211, 0.85) 0%, rgba(251, 207, 232, 0.5) 50%, rgba(255, 241, 242, 0) 75%)',
          }}
        />

        {/* Floating Bokeh Light Spot 1 (Top Left) */}
        <div
          className="absolute -top-12 -left-12 w-72 h-72 rounded-full blur-2xl opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(253, 164, 175, 0.45) 0%, rgba(252, 231, 243, 0) 70%)',
          }}
        />

        {/* Floating Bokeh Light Spot 2 (Bottom Right) */}
        <div
          className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full blur-2xl opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(244, 114, 182, 0.35) 0%, rgba(255, 228, 230, 0) 70%)',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BAR: NAVIGATION & MUSIC */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between pointer-events-auto">
        {/* Back to Previous Quiz / Stage */}
        {onReturnToPreviousStage ? (
          <button
            type="button"
            onClick={onReturnToPreviousStage}
            aria-label="Back to Couple Quiz"
            className="px-3.5 py-2 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-pink-700 transition-all duration-300 shadow-sm backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold tracking-wider hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Quiz</span>
          </button>
        ) : onReturnToEntrance ? (
          <button
            type="button"
            onClick={onReturnToEntrance}
            aria-label="Back to Entrance"
            className="px-3.5 py-2 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-pink-700 transition-all duration-300 shadow-sm backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold tracking-wider hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Entrance</span>
          </button>
        ) : (
          <div className="w-8" />
        )}

        {/* Music toggle button */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={isMuted ? 'Unmute birthday music' : 'Mute birthday music'}
          className="px-3.5 py-2 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-pink-700 transition-all duration-300 shadow-sm backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold tracking-wider hover:scale-105 active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-pink-500 animate-pulse" />}
          <span>{isMuted ? 'Music Muted' : 'Music On 🎵'}</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN CENTER SECTION */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center w-full max-w-4xl mx-auto my-auto py-6">
        <div className="relative flex flex-col items-center justify-center space-y-4 sm:space-y-6">
          {/* ------------------------------------------------------------- */}
          {/* 1. "HAPPY BIRTHDAY" TEXT (Slow Majestic Reveal) */}
          {/* ------------------------------------------------------------- */}
          <div
            className={`transition-all duration-[2200ms] ease-out transform ${
              showHappyBirthday
                ? 'opacity-100 translate-y-0 scale-100 tracking-[0.22em] sm:tracking-[0.26em]'
                : 'opacity-0 translate-y-8 scale-90 tracking-[0.05em]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-pink-400/80 mb-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-cinzel font-bold tracking-[0.3em] uppercase text-pink-500">
                Special Celebration
              </span>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>

            <h1
              id="happy-birthday-title"
              className="font-cinzel text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 drop-shadow-[0_4px_18px_rgba(244,114,182,0.4)]"
            >
              HAPPY BIRTHDAY
            </h1>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 2. "DRACULA" TEXT (Slow, Grand, Cinematic Glow) */}
          {/* ------------------------------------------------------------- */}
          <div
            className={`transition-all duration-[2400ms] ease-out transform ${
              showDracula
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-10 scale-85'
            }`}
          >
            <h2
              id="dracula-name-title"
              className="font-cinzel text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.16em] sm:tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 drop-shadow-[0_6px_28px_rgba(244,63,94,0.35)]"
            >
              DRACULA
            </h2>

            {/* Subtle Decorative Delicate Divider */}
            <div className="pt-3 flex items-center justify-center gap-3 opacity-80">
              <span className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-r from-transparent to-pink-300 rounded-full" />
              <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
              <span className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-l from-transparent to-pink-300 rounded-full" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. INTERACTIVE CAKE-CUTTING / MEMORY REPLAY SECTION */}
        {/* ========================================================================= */}
        <div
          className={`mt-6 sm:mt-8 w-full flex flex-col items-center justify-center transition-all duration-[1600ms] ease-out ${
            showSurprisePrompt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          {showSurprisePrompt && (
            <CakeCuttingChallenge
              onCutSuccess={handleCakeCutSuccess}
              onStartMusic={() => setIsMuted(birthdayMusicPlayer.getIsMuted())}
              onReopenMemories={() => setHasOpened(true)}
              isAlreadyCut={isCakeCutComplete}
            />
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. SUBTLE BOTTOM ACTIONS (Replay Quiz / Castle Entrance) */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full max-w-3xl mx-auto px-4 pb-6 sm:pb-8 flex flex-wrap items-center justify-center gap-3">
        {isCakeCutComplete && (
          <button
            type="button"
            onClick={() => setHasOpened(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white font-cinzel text-xs font-bold tracking-[0.16em] uppercase shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Eye className="w-3.5 h-3.5 text-amber-200" />
            <span>Open Photos Journey</span>
          </button>
        )}

        {onRestartQuiz && (
          <button
            type="button"
            id="btn-replay-quiz"
            onClick={onRestartQuiz}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-600 font-cinzel text-xs font-semibold tracking-[0.14em] uppercase shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm cursor-pointer hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Quiz</span>
          </button>
        )}

        {onReturnToEntrance && (
          <button
            type="button"
            id="btn-return-entrance"
            onClick={onReturnToEntrance}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-600 font-cinzel text-xs font-semibold tracking-[0.14em] uppercase shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm cursor-pointer hover:scale-105 active:scale-95"
          >
            <span>Castle Entrance</span>
          </button>
        )}
      </footer>

      {/* ========================================================================= */}
      {/* 6. FULL-SCREEN INTERACTIVE SCROLLING MEMORY JOURNEY */}
      {/* ========================================================================= */}
      {hasOpened && (
        <InteractiveMemoryJourney
          onClose={() => setHasOpened(false)}
          onReturnToEntrance={onReturnToEntrance}
        />
      )}
    </div>
  );
};
