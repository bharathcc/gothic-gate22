import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ArrowLeft,
  RotateCcw,
  User,
  Clock,
  Zap,
  Flame,
  Volume2,
  Key as KeyIcon,
  ShieldAlert,
  Moon,
  Smile,
} from 'lucide-react';
import { VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface TreasureHuntPageProps {
  user: VisitorUser;
  sessionId?: string;
  onReturnToPuzzle?: () => void;
  onProceedToPage4?: () => void;
}

// 20 Progressive Dracula Reactions
interface DraculaReaction {
  text: string;
  expression: 'sleeping' | 'stirring' | 'grumpy' | 'annoyed' | 'angry' | 'furious' | 'awake';
  subtitle?: string;
  avatarEmoji: string;
}

const DRACULA_REACTIONS: DraculaReaction[] = [
  { text: 'Hmm...?', expression: 'stirring', subtitle: 'Dracula slightly moves.', avatarEmoji: '😴' }, // 1
  { text: 'Five more minutes...', expression: 'stirring', subtitle: 'She turns slightly.', avatarEmoji: '🛌' }, // 2
  { text: 'Zzzzz...', expression: 'sleeping', subtitle: 'Small snore.', avatarEmoji: '💤' }, // 3
  { text: 'Who...?', expression: 'stirring', subtitle: 'Eyes briefly open.', avatarEmoji: '👁️' }, // 4
  { text: 'Did you just wake me?', expression: 'grumpy', subtitle: 'She looks annoyed.', avatarEmoji: '😑' }, // 5
  { text: 'Stop.', expression: 'grumpy', subtitle: 'A stern quiet rumble.', avatarEmoji: '🤨' }, // 6
  { text: 'Leave me alone...', expression: 'stirring', subtitle: 'Dracula covers her face with her blanket.', avatarEmoji: '🙈' }, // 7
  { text: 'Seriously?', expression: 'annoyed', subtitle: 'She frowns deeply.', avatarEmoji: '😒' }, // 8
  { text: 'WHY ARE YOU DOING THIS?', expression: 'annoyed', subtitle: 'Dracula becomes more annoyed.', avatarEmoji: '😠' }, // 9
  { text: "I'M TRYING TO SLEEP!", expression: 'annoyed', subtitle: 'She sits up slightly.', avatarEmoji: '😤' }, // 10
  { text: 'STOP CLICKING ME!', expression: 'angry', subtitle: 'Her cape rustles sharply.', avatarEmoji: '😡' }, // 11
  { text: 'YOU HAVE BEEN WARNED.', expression: 'angry', subtitle: 'She gets more angry.', avatarEmoji: '⚡' }, // 12
  { text: 'Okay... that\'s enough.', expression: 'angry', subtitle: 'Dracula looks directly toward the visitor.', avatarEmoji: '👀' }, // 13
  { text: 'LAST WARNING.', expression: 'angry', subtitle: 'Fangs slightly gleam in the dark.', avatarEmoji: '🧛‍♀️' }, // 14
  { text: 'YOU REALLY WANT TO DO THIS?', expression: 'furious', subtitle: 'Dracula gets angry.', avatarEmoji: '🔥' }, // 15
  { text: 'FINE!', expression: 'furious', subtitle: 'She sits up more.', avatarEmoji: '💢' }, // 16
  { text: 'JUST THREE MORE?!', expression: 'furious', subtitle: 'Her impatience boils over!', avatarEmoji: '🤯' }, // 17
  { text: "YOU'RE VERY ANNOYING.", expression: 'furious', subtitle: 'Eyes ablaze with ancient irritation.', avatarEmoji: '👿' }, // 18
  { text: 'ONE MORE CLICK...', expression: 'furious', subtitle: 'Dracula gets fully ready to wake up.', avatarEmoji: '💥' }, // 19
  { text: "FINALLY! I'M AWAKE!", expression: 'awake', subtitle: 'Dracula suddenly wakes up!', avatarEmoji: '🧛‍♀️' }, // 20
];

export const TreasureHuntPage: React.FC<TreasureHuntPageProps> = ({
  user,
  sessionId,
  onReturnToPuzzle,
  onProceedToPage4,
}) => {
  // Verification log on mount
  useEffect(() => {
    console.log('=== PAGE 3: WAKE UP DRACULA LOADED ===');
  }, []);

  // Game Flow Phases: 'intro' | 'playing' | 'failed' | 'success_dialogue' | 'key_reveal' | 'navigating'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'failed' | 'success_dialogue' | 'key_reveal' | 'navigating'>('intro');

  // Interactive Click Tracker & Timer
  const [clickCount, setClickCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Reaction Visual State
  const [currentReaction, setCurrentReaction] = useState<DraculaReaction | null>(null);
  const [isJolting, setIsJolting] = useState<boolean>(false);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [snoreIndex, setSnoreIndex] = useState<number>(0);

  // Final Funny Sequence Dialogue Phase (0: "Are you happy now?", 1: "WHY DID YOU WAKE ME?! 😂", 2: "Fine...", 3: "TAKE THIS. YOU'LL NEED IT.")
  const [dialoguePhase, setDialoguePhase] = useState<number>(0);

  // Timeouts & Interval Refs for rock-solid cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isCompletedRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);

  // Background smooth fade-in
  const [hasFadedIn, setHasFadedIn] = useState<boolean>(false);
  useEffect(() => {
    const t = setTimeout(() => setHasFadedIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Periodic snore bubbles during peaceful sleeping
  useEffect(() => {
    if (gameState === 'intro' || (gameState === 'playing' && clickCount < 4)) {
      const snoreInterval = setInterval(() => {
        setSnoreIndex((prev) => (prev + 1) % 4);
      }, 3000);
      return () => clearInterval(snoreInterval);
    }
  }, [gameState, clickCount]);

  // Clean up all timers on unmount
  const clearAllTimeouts = useCallback(() => {
    sequenceTimeoutsRef.current.forEach((t) => clearTimeout(t));
    sequenceTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Start the 20-second challenge
  const handleStartGame = () => {
    soundEngine.playHoverTone();
    soundEngine.playDraculaSnore();
    setClickCount(0);
    setTimeLeft(20);
    setCurrentReaction(null);
    isCompletedRef.current = false;
    setGameState('playing');

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (isCompletedRef.current) return prev;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        if (prev <= 6) {
          soundEngine.playTimerTick(true);
        } else {
          soundEngine.playTimerTick(false);
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Timer Failure Handler
  const handleTimeOut = () => {
    if (isCompletedRef.current) return;
    soundEngine.playFailureGong();
    setGameState('failed');
  };

  // Reset Game / Try Again
  const handleRetry = () => {
    clearAllTimeouts();
    handleStartGame();
  };

  // Primary Click / Tap Reaction Handler
  const handleWakeClick = () => {
    if (gameState !== 'playing' || isCompletedRef.current) return;

    // Debounce very high frequency double-taps (< 60ms) to ensure accurate individual clicks
    const now = Date.now();
    if (now - lastClickTimeRef.current < 60) return;
    lastClickTimeRef.current = now;

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    const reaction = DRACULA_REACTIONS[nextCount - 1] || DRACULA_REACTIONS[DRACULA_REACTIONS.length - 1];
    setCurrentReaction(reaction);

    // Audio effects scaling with annoyance level
    if (nextCount === 20) {
      soundEngine.playDraculaWakeUp();
    } else if (nextCount >= 15) {
      soundEngine.playDraculaPoke(nextCount);
      soundEngine.playDraculaAnnoyed(nextCount);
    } else if (nextCount >= 9) {
      soundEngine.playDraculaPoke(nextCount);
      soundEngine.playDraculaAnnoyed(nextCount);
    } else if (nextCount === 3) {
      soundEngine.playDraculaSnore();
    } else {
      soundEngine.playDraculaPoke(nextCount);
    }

    // Visual Jolt Animation
    setIsJolting(true);
    setTimeout(() => setIsJolting(false), 220);

    // Subtle Screen Shake on heavier annoyance
    if (nextCount >= 10 || nextCount === 20) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }

    // Success condition reached! (20 / 20)
    if (nextCount >= 20) {
      isCompletedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      triggerSuccessSequence();
    }
  };

  // Final Funny Sequence & Key Reveal
  const triggerSuccessSequence = () => {
    clearAllTimeouts();

    if (sessionId) {
      void fetch('/api/wake-dracula/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          clicks: 20,
          timeTakenSeconds: 20 - timeLeft,
          timeRemainingSeconds: timeLeft,
        }),
      });
    }

    // Stage 1: Transition to success dialog after wake-up shock
    const t1 = setTimeout(() => {
      setGameState('success_dialogue');
      setDialoguePhase(0); // "Are you happy now?"
    }, 1800);
    sequenceTimeoutsRef.current.push(t1);

    // Stage 2: "WHY DID YOU WAKE ME?! 😂"
    const t2 = setTimeout(() => {
      setDialoguePhase(1);
      soundEngine.playDraculaAnnoyed(10);
    }, 3600);
    sequenceTimeoutsRef.current.push(t2);

    // Stage 3: "Fine..."
    const t3 = setTimeout(() => {
      setDialoguePhase(2);
    }, 5400);
    sequenceTimeoutsRef.current.push(t3);

    // Stage 4: "TAKE THIS. YOU'LL NEED IT." & Key floats into view
    const t4 = setTimeout(() => {
      setDialoguePhase(3);
      setGameState('key_reveal');
      soundEngine.playKeyGlow();
    }, 7200);
    sequenceTimeoutsRef.current.push(t4);

    // Stage 5: Automatically navigate to Page 4 approximately 2.2 seconds after key is obtained
    const t5 = setTimeout(() => {
      setGameState('navigating');
      soundEngine.playSuccessGateOpen();
      if (onProceedToPage4) {
        onProceedToPage4();
      }
    }, 9800);
    sequenceTimeoutsRef.current.push(t5);
  };

  return (
    <div
      id="wake-up-dracula-root"
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-[#03060e] text-slate-200 transition-all duration-700 ${
        hasFadedIn ? 'opacity-100' : 'opacity-0'
      } ${screenShake ? 'translate-x-1 -translate-y-1 rotate-[0.3deg]' : ''}`}
    >
      {/* ========================================================================= */}
      {/* 1. EXACT FULL-SCREEN PROVIDED GOTHIC BACKGROUND IMAGE */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-[0.92] contrast-105"
        style={{ backgroundImage: "url('/page3_bg.png')" }}
      />

      {/* ========================================================================= */}
      {/* 2. ATMOSPHERIC LIVING ROOM ANIMATIONS (OVERLAYS) */}
      {/* ========================================================================= */}

      {/* A. MOONLIGHT THROUGH LARGE WINDOW */}
      <div className="absolute top-0 right-[8%] sm:right-[15%] w-64 sm:w-96 h-[60%] bg-gradient-to-b from-cyan-200/10 via-cyan-400/5 to-transparent blur-2xl pointer-events-none animate-moonlight" />
      <div
        className="absolute top-8 right-[12%] sm:right-[20%] w-48 h-72 bg-[radial-gradient(ellipse_at_top,rgba(186,230,253,0.12)_0%,transparent_70%)] pointer-events-none animate-pulse"
        style={{ animationDuration: '7s' }}
      />

      {/* B. CURTAINS BREEZE */}
      <div className="absolute top-12 right-[6%] sm:right-[10%] w-24 sm:w-36 h-[55%] bg-gradient-to-l from-transparent via-cyan-900/10 to-transparent pointer-events-none animate-curtain-breeze" />

      {/* C. FIREPLACE ANIMATED FLAMES, GLOW & EMBERS */}
      <div className="absolute bottom-[22%] left-[12%] sm:left-[16%] w-52 sm:w-72 h-44 sm:h-56 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.35)_0%,rgba(234,88,12,0.15)_45%,transparent_75%)] blur-xl pointer-events-none animate-hearth-glow" />
      <div className="absolute bottom-[28%] left-[16%] sm:left-[19%] w-20 sm:w-28 h-16 sm:h-22 pointer-events-none flex items-end justify-center">
        <div className="w-8 h-14 bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-200 rounded-t-full blur-[1px] animate-flame-a opacity-90" />
        <div className="w-7 h-12 -ml-3 bg-gradient-to-t from-red-600 via-orange-500 to-amber-200 rounded-t-full blur-[1px] animate-flame-b opacity-85" />
        <div className="w-6 h-10 -ml-2 bg-gradient-to-t from-amber-600 via-yellow-500 to-white rounded-t-full blur-[1px] animate-flame-c opacity-90" />
      </div>

      {/* D. CANDLE FLAMES & GLOWS */}
      <div className="absolute bottom-[32%] left-[44%] sm:left-[46%] w-6 h-10 pointer-events-none flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-amber-400/20 blur-md animate-candle-glow -mb-6" />
        <div className="w-3.5 h-6 bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-100 rounded-t-full blur-[0.5px] animate-flame-a" />
      </div>
      <div className="absolute bottom-[34%] right-[32%] sm:right-[34%] w-6 h-10 pointer-events-none flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-amber-400/20 blur-md animate-candle-glow -mb-5" style={{ animationDelay: '0.9s' }} />
        <div className="w-3 h-5 bg-gradient-to-t from-orange-500 via-amber-300 to-white rounded-t-full blur-[0.5px] animate-flame-b" />
      </div>

      {/* E. GRANDFATHER CLOCK PENDULUM */}
      <div className="absolute top-[28%] left-[4%] sm:left-[6%] w-10 sm:w-14 h-48 pointer-events-none flex flex-col items-center">
        <div className="mt-20 w-1 bg-amber-400/40 h-14 animate-pendulum flex flex-col items-center">
          <div className="mt-auto w-3 h-3 rounded-full bg-amber-300/80 border border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </div>
      </div>

      {/* F. FLOATING DUST MOTES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 rounded-full bg-amber-200 blur-[0.5px]" style={{ animation: 'dustDrift 9s linear infinite 0.5s' }} />
        <div className="absolute top-[45%] right-[22%] w-2 h-2 rounded-full bg-cyan-200 blur-[0.5px]" style={{ animation: 'dustDrift 11s linear infinite 2s' }} />
        <div className="absolute bottom-[40%] left-[50%] w-1.5 h-1.5 rounded-full bg-amber-100 blur-[0.5px]" style={{ animation: 'dustDrift 8s linear infinite 4s' }} />
      </div>

      {/* G. SUBTLE FLOOR FOG */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#02050b]/80 via-transparent to-transparent pointer-events-none" />

      {/* ========================================================================= */}
      {/* 3. TOP NAVIGATION & PROGRESS HEADER */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-3 pb-1 flex items-center justify-between pointer-events-auto">
        {/* Left Back / User Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onReturnToPuzzle && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHoverTone();
                onReturnToPuzzle();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-slate-700/70 text-slate-300 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-all backdrop-blur-md cursor-pointer group shadow-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Page 2 Puzzle</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-cyan-500/30 text-xs font-cinzel text-cyan-300 backdrop-blur-md shadow-lg">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[110px] sm:max-w-[160px] truncate">{user.name}</span>
          </div>
        </div>

        {/* Center Title Badge */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/85 border border-red-500/40 text-red-300 font-cinzel text-xs tracking-[0.25em] uppercase shadow-lg backdrop-blur-md">
            <span>🧛 WAKE UP DRACULA</span>
          </div>
        </div>

        {/* Right Status (Progress & Time Counter when playing) */}
        {gameState === 'playing' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Progress Count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border border-red-500/50 text-xs font-cinzel backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-300 font-semibold tracking-wider">WAKE UP:</span>
              <span className="text-amber-300 font-bold ml-1 text-sm font-mono">
                {clickCount} <span className="text-slate-500 font-normal text-xs">/ 20</span>
              </span>
            </div>

            {/* Timer Counter */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border text-xs font-cinzel backdrop-blur-md shadow-lg transition-all ${
                timeLeft <= 6
                  ? 'border-red-500 text-red-400 animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.6)]'
                  : 'border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="font-semibold tracking-wider">TIME:</span>
              <span className="font-bold ml-1 text-sm font-mono">{timeLeft}s</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-slate-700/60 text-xs font-cinzel text-slate-300 backdrop-blur-md">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chapter III</span>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 4. MAIN INTERACTIVE STAGE & DRACULA CHARACTER AREA */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 w-full flex flex-col items-center justify-center p-3 sm:p-6">
        {/* ------------------------------------------------------------- */}
        {/* A. SLEEPING DRACULA AMBIENT LIVING AVATAR / CHARACTER HUB */}
        {/* ------------------------------------------------------------- */}
        <div
          onClick={gameState === 'playing' ? handleWakeClick : undefined}
          className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
            gameState === 'playing' ? 'cursor-pointer' : ''
          } ${isJolting ? 'animate-dracula-jolt' : ''}`}
        >
          {/* Snoring floating "Zzz..." indicator when sleeping peacefully */}
          {(gameState === 'intro' || (gameState === 'playing' && clickCount < 4)) && (
            <div className="absolute -top-12 right-2 sm:right-6 flex flex-col items-end pointer-events-none">
              <span className="font-cinzel text-cyan-300/80 font-bold text-sm sm:text-base tracking-widest animate-snore-float">
                Z<span className="text-xs">z</span><span className="text-[10px]">z...</span>
              </span>
            </div>
          )}

          {/* Living Dracula Coffin/Bed Silhouette & Reaction Aura */}
          <div
            className={`relative w-44 sm:w-56 h-44 sm:h-56 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 ${
              gameState === 'intro'
                ? 'border-indigo-500/40 bg-indigo-950/30 backdrop-blur-sm shadow-[0_0_50px_rgba(99,102,241,0.2)] animate-dracula-breathe'
                : clickCount >= 20
                ? 'border-red-500 bg-red-950/60 backdrop-blur-md shadow-[0_0_80px_rgba(239,68,68,0.8)] scale-110'
                : clickCount >= 14
                ? 'border-red-500/80 bg-red-950/40 shadow-[0_0_60px_rgba(239,68,68,0.6)] animate-dracula-angry scale-105'
                : clickCount >= 8
                ? 'border-amber-500/60 bg-amber-950/30 shadow-[0_0_40px_rgba(245,158,11,0.4)]'
                : 'border-cyan-500/40 bg-slate-900/40 shadow-[0_0_30px_rgba(56,189,248,0.25)] animate-dracula-breathe'
            }`}
          >
            {/* Dracula Reaction Emoji Avatar */}
            <div className="text-5xl sm:text-7xl select-none filter drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)] transition-transform duration-200">
              {currentReaction ? currentReaction.avatarEmoji : '😴'}
            </div>

            {/* Subtle Sleeping / Annoyance Badge */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-black/80 border border-slate-700/80 text-[10px] sm:text-xs font-cinzel tracking-widest text-slate-300 uppercase shadow-md">
              {clickCount === 0
                ? 'Peacefully Sleeping'
                : clickCount >= 20
                ? '⚡ FULLY AWAKE!'
                : `Annoyance: ${Math.round((clickCount / 20) * 100)}%`}
            </div>
          </div>

          {/* Dracula Dynamic Speech Bubble Overlay */}
          {currentReaction && gameState === 'playing' && (
            <div className="mt-3 px-5 py-2.5 rounded-2xl bg-black/90 border border-red-500/70 text-center shadow-[0_0_35px_rgba(239,68,68,0.6)] animate-fadeIn max-w-xs sm:max-w-md z-30">
              <p className="font-cinzel font-bold text-white text-sm sm:text-lg tracking-wider text-red-200">
                "{currentReaction.text}"
              </p>
              {currentReaction.subtitle && (
                <p className="font-cormorant italic text-xs sm:text-sm text-slate-400 mt-0.5">
                  {currentReaction.subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* B. INTRO CINEMATIC CARD */}
        {/* ------------------------------------------------------------- */}
        {gameState === 'intro' && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border border-red-500/40 shadow-[0_0_70px_rgba(239,68,68,0.25)] bg-[#05020a]/90 backdrop-blur-xl animate-fadeIn flex flex-col items-center mt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-400/50 text-red-300 text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase mb-4 shadow-[0_0_25px_rgba(239,68,68,0.4)]">
              <span>WAKE UP DRACULA</span>
            </div>

            <h1 className="text-lg sm:text-2xl font-cinzel-decorative font-bold text-white tracking-[0.16em] uppercase mb-2 drop-shadow-[0_2px_15px_rgba(239,68,68,0.7)]">
              She is sleeping...
            </h1>

            <p className="font-cormorant text-base sm:text-lg text-slate-300 italic mb-6 max-w-md mx-auto">
              The ancient vampire is sleeping deeply in her gothic sanctuary. Let's annoy her. 😈
            </p>

            {/* Start Button */}
            <button
              type="button"
              id="btn-start-wake-game"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_40px_rgba(239,68,68,0.6)] border border-red-300 hover:scale-105 active:scale-95 transition-all"
            >
              <span>[ WAKE HER UP ]</span>
            </button>

            <span className="text-[11px] font-cinzel text-slate-500 uppercase tracking-widest mt-4">
              Goal: Click 20 times within 20 seconds
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* C. ACTIVE PLAYING CONTROLS & GIANT TAP BUTTON */}
        {/* ------------------------------------------------------------- */}
        {gameState === 'playing' && (
          <div className="w-full max-w-md mx-auto text-center flex flex-col items-center mt-4">
            {/* Progress Annoyance Bar */}
            <div className="w-full bg-slate-900/90 rounded-full h-3.5 p-0.5 border border-slate-700 mb-4 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-150 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                style={{ width: `${(clickCount / 20) * 100}%` }}
              />
            </div>

            {/* Giant Easy-Tap Action Button */}
            <button
              type="button"
              id="btn-wake-her-up"
              onClick={handleWakeClick}
              className="w-full py-4 sm:py-5 px-8 rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-orange-600 hover:from-red-600 hover:to-orange-500 active:scale-90 text-white font-cinzel font-bold text-base sm:text-xl tracking-[0.25em] uppercase flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_50px_rgba(239,68,68,0.7)] border-2 border-red-300 transition-transform select-none"
            >
              <Zap className="w-5 h-5 text-yellow-300 animate-bounce" />
              <span>WAKE HER UP!</span>
              <span className="text-xs sm:text-sm font-mono bg-black/40 px-2 py-0.5 rounded-lg border border-red-400/40">
                {clickCount}/20
              </span>
            </button>

            <span className="text-[11px] font-cinzel text-slate-400 tracking-wider uppercase mt-3">
              Tap the button or tap Dracula directly!
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* D. TIME OUT / FAILED STATE */}
        {/* ------------------------------------------------------------- */}
        {gameState === 'failed' && (
          <div className="w-full max-w-md mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border border-slate-600 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-[#08050e]/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center mt-4">
            <div className="text-4xl mb-2">😴</div>
            <div className="inline-block px-4 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-cinzel text-slate-300 uppercase tracking-widest mb-3">
              DRACULA WENT BACK TO SLEEP...
            </div>

            <h2 className="text-base sm:text-lg font-cinzel-decorative font-bold text-slate-200 tracking-wider mb-2">
              YOU WEREN'T ANNOYING ENOUGH. 😂
            </h2>

            <p className="font-cormorant text-sm sm:text-base text-slate-400 italic mb-6">
              You reached {clickCount} / 20 clicks before time ran out. She pulled her blanket tighter and resumed snoring.
            </p>

            <button
              type="button"
              id="btn-retry-wake"
              onClick={handleRetry}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-indigo-600 hover:from-cyan-600 hover:to-indigo-500 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(56,189,248,0.5)] border border-cyan-300 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>[ TRY AGAIN ]</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* E. POST-WAKE DIALOGUE SEQUENCE */}
        {/* ------------------------------------------------------------- */}
        {gameState === 'success_dialogue' && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.8)] bg-[#0d0408]/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center mt-4">
            <div className="text-5xl mb-3 animate-bounce">🧛‍♀️</div>

            <div className="inline-block px-4 py-1 rounded-full bg-red-950 border border-red-400 text-xs font-cinzel text-red-200 uppercase tracking-widest font-bold mb-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
              DRACULA IS AWAKE!
            </div>

            {/* Progressive Dialogue Steps */}
            {dialoguePhase === 0 && (
              <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-white tracking-widest uppercase my-4 animate-fadeIn">
                "Are you happy now?"
              </h2>
            )}

            {dialoguePhase === 1 && (
              <div className="my-3 animate-fadeIn">
                <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-red-300 tracking-wider uppercase mb-1">
                  "WHY DID YOU WAKE ME?! 😂"
                </h2>
                <p className="font-cormorant text-base text-slate-300 italic">
                  She rubs her centuries-old eyes and looks at you in utter disbelief.
                </p>
              </div>
            )}

            {dialoguePhase === 2 && (
              <div className="my-3 animate-fadeIn">
                <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-amber-200 tracking-wider uppercase mb-1">
                  "Fine..."
                </h2>
                <p className="font-cormorant text-base text-slate-300 italic">
                  Dracula sighs deeply, realizing you need to continue your journey...
                </p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* F. MYSTERIOUS KEY REVEAL & OBTAINED ANIMATION */}
        {/* ------------------------------------------------------------- */}
        {(gameState === 'key_reveal' || gameState === 'navigating') && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-amber-400 shadow-[0_0_90px_rgba(245,158,11,0.9)] bg-[#120a02]/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center mt-4 z-40">
            {/* Floating Glowing Key */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-24 sm:w-32 h-24 sm:h-32 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-0.5 animate-key-float shadow-[0_0_60px_rgba(245,158,11,0.9)] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center relative overflow-hidden">
                  <KeyIcon className="w-12 sm:w-16 h-12 sm:h-16 text-yellow-300 filter drop-shadow-[0_0_15px_rgba(245,158,11,1)]" />
                  <Sparkles className="w-6 h-6 text-white absolute top-2 right-2 animate-sparkle" />
                  <Sparkles className="w-5 h-5 text-amber-200 absolute bottom-3 left-3 animate-sparkle" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>

            {/* Dracula Dialogue */}
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-amber-200 tracking-wider uppercase">
                "TAKE THIS. YOU'LL NEED IT."
              </h2>
              <p className="font-cormorant text-base text-slate-300 italic mt-1">
                Dracula hands you the ancient Relic Key of the Manor.
              </p>
            </div>

            {/* KEY OBTAINED BADGE */}
            <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border border-yellow-200 text-black font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase shadow-[0_0_35px_rgba(245,158,11,0.8)] animate-bounce flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black" />
              <span>KEY OBTAINED 🔑</span>
            </div>

            <span className="text-[11px] font-cinzel text-amber-300/80 uppercase tracking-widest mt-4 animate-pulse">
              Unlocking Chapter IV...
            </span>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 5. FOOTER INSCRIPTION */}
      {/* ========================================================================= */}
      <footer className="relative z-20 pb-3 text-center text-slate-500/80 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none">
        Chapter III &bull; Wake Up Dracula &bull; Living Gothic Chamber
      </footer>
    </div>
  );
};
