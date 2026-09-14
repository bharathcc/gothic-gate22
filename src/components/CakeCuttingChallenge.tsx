import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Star } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

interface CakeCuttingChallengeProps {
  onCutSuccess: () => void;
  onStartMusic?: () => void;
  onReopenMemories?: () => void;
  isAlreadyCut?: boolean;
}

export const CakeCuttingChallenge: React.FC<CakeCuttingChallengeProps> = ({
  onCutSuccess,
  onStartMusic,
  onReopenMemories,
  isAlreadyCut = false,
}) => {
  // Current Stage: 'open_button' (Stage 1) -> 'cake_cutting' (Stage 2)
  const [stage, setStage] = useState<'open_button' | 'cake_cutting'>(isAlreadyCut ? 'cake_cutting' : 'open_button');

  // =========================================================================
  // STAGE 1: OPEN BUTTON INTERACTION (Playful Proximity & Evasive Dodging)
  // =========================================================================
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [dodgeCount, setDodgeCount] = useState<number>(0);
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDodging, setIsDodging] = useState<boolean>(false);
  const maxDodges = 4;

  const buttonRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const lastDodgeTimeRef = useRef<number>(0);

  const dodgeTexts = [
    { title: 'One more surprise... 👀', subtitle: 'Wanna see it?' },
    { title: 'Oops, too slow! 😂', subtitle: 'Try to catch it Dracula!' },
    { title: 'Almost got me! 😜', subtitle: 'You gotta be faster than that!' },
    { title: 'Catch me if you can! 🏃‍♀️💨', subtitle: 'Come on, one more try!' },
    { title: 'Okay okay, you caught me! 🎉', subtitle: 'Click to OPEN your surprise!' },
  ];

  const currentDodgeText = dodgeTexts[Math.min(dodgeCount, dodgeTexts.length - 1)];

  // Preset distinct dodge landing coordinates to guarantee high visual variety and bounds safety
  const dodgePositions = [
    { x: -110, y: -40 },
    { x: 110, y: -35 },
    { x: -90, y: 35 },
    { x: 95, y: 40 },
    { x: -105, y: 10 },
    { x: 105, y: -10 },
    { x: 0, y: -45 },
    { x: 0, y: 40 },
  ];

  // Perform the playful dodge jump
  const triggerDodge = useCallback(() => {
    const now = Date.now();
    // Debounce very rapid multi-triggers within 350ms
    if (now - lastDodgeTimeRef.current < 350) return;
    if (isOpening || dodgeCount >= maxDodges) return;

    lastDodgeTimeRef.current = now;
    setIsDodging(true);
    soundEngine.playCakeDodge();

    // Select the next landing spot
    const nextSpot = dodgePositions[dodgeCount % dodgePositions.length];
    // Add minor organic jitter (+/- 15px)
    const jitterX = Math.round((Math.random() - 0.5) * 25);
    const jitterY = Math.round((Math.random() - 0.5) * 15);

    setButtonPos({
      x: nextSpot.x + jitterX,
      y: nextSpot.y + jitterY,
    });

    setDodgeCount((prev) => prev + 1);

    setTimeout(() => {
      setIsDodging(false);
    }, 400);
  }, [dodgeCount, isOpening, maxDodges]);

  // Proximity detection: if cursor/touch approaches within 85px, the button leaps away!
  const handleArenaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'open_button' || isOpening || dodgeCount >= maxDodges || isDodging) return;
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;
    const distance = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

    if (distance < 85) {
      triggerDodge();
    }
  };

  // Directly Open and transition to Stage 2 (Cake Cutting)
  const handleOpenClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // If hasn't dodged enough times yet, clicking/tapping triggers a dodge jump!
    if (dodgeCount < maxDodges) {
      triggerDodge();
      return;
    }

    if (isOpening) return;
    setIsOpening(true);
    soundEngine.playSuccessGateOpen();

    // Start birthday music immediately on user gesture
    try {
      birthdayMusicPlayer.start();
      onStartMusic?.();
    } catch {
      // Audio context fallback
    }

    // Smoothly transition to Stage 2 (Cake Cutting)
    setTimeout(() => {
      setStage('cake_cutting');
    }, 450);
  };

  // =========================================================================
  // STAGE 2: CAKE CUTTING (STATIONARY CAKE + HIGH-PERFORMANCE DRAGGABLE KNIFE)
  // =========================================================================
  const [knifePos, setKnifePos] = useState<{ x: number; y: number }>({ x: 0, y: -95 });
  const [isDraggingKnife, setIsDraggingKnife] = useState<boolean>(false);
  const [isCutting, setIsCutting] = useState<boolean>(false);
  const [isCutComplete, setIsCutComplete] = useState<boolean>(isAlreadyCut);
  const [successStep, setSuccessStep] = useState<number>(isAlreadyCut ? 2 : 0);
  const [crumbs, setCrumbs] = useState<Array<{ id: number; x: number; y: number; size: number; color: string }>>([]);

  const cakeArenaRef = useRef<HTMLDivElement>(null);
  const arenaRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const isCutTriggeredRef = useRef<boolean>(isAlreadyCut);
  const rAFRef = useRef<number | null>(null);

  // Reset Cake cutting state so user can slice again!
  const handleResetCake = () => {
    isCutTriggeredRef.current = false;
    setIsCutting(false);
    setIsCutComplete(false);
    setSuccessStep(0);
    setCrumbs([]);
    setKnifePos({ x: 0, y: -95 });
    soundEngine.playHoverTone();
  };

  // Perform the physical cutting animation
  const executeCut = useCallback(() => {
    if (isCutTriggeredRef.current || isCutting || isCutComplete) return;
    isCutTriggeredRef.current = true;
    setIsCutting(true);
    setIsDraggingKnife(false);

    // Knife visibly animates downward through center of cake
    setKnifePos({ x: 0, y: 75 });
    soundEngine.playCakeSlice();

    // Generate lightweight cake crumbs
    const newCrumbs = Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 140,
      y: (Math.random() - 0.5) * 70 + 15,
      size: Math.random() * 5 + 3,
      color: ['#f59e0b', '#fbbf24', '#f43f5e', '#fda4af', '#fde047', '#f472b6'][i % 6],
    }));
    setCrumbs(newCrumbs);

    // Cake splits into two halves as the knife passes through
    setTimeout(() => {
      setIsCutComplete(true);
      setSuccessStep(1); // "FINALLY! 😂"
    }, 400);

    // Step 2: "Okay... now you're ready. 👀"
    setTimeout(() => {
      setSuccessStep(2);
    }, 1600);

    // Transition into Final Memory Journey
    setTimeout(() => {
      onCutSuccess();
    }, 3000);
  }, [isCutting, isCutComplete, onCutSuccess]);

  // Check if knife is dragged down through the center cake area
  const checkCakeIntersection = useCallback(
    (x: number, y: number) => {
      if (isCutting || isCutComplete || isCutTriggeredRef.current) return;

      // Cake is stationary at center (0, 30).
      // If knife reaches near center top of cake and user moves downward (y >= -15px and |x| <= 75px):
      if (y >= -15 && Math.abs(x) <= 75) {
        executeCut();
      }
    },
    [isCutting, isCutComplete, executeCut]
  );

  // Pointer Down: Start Dragging Knife
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCutting || isCutComplete) return;
    e.preventDefault();
    e.stopPropagation();

    // Ensure birthday music is playing
    if (!birthdayMusicPlayer.getIsPlaying()) {
      try {
        birthdayMusicPlayer.start();
        onStartMusic?.();
      } catch {
        // Fallback
      }
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    if (!cakeArenaRef.current) return;
    const rect = cakeArenaRef.current.getBoundingClientRect();
    arenaRectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    const currentX = e.clientX - (rect.left + rect.width / 2);
    const currentY = e.clientY - (rect.top + rect.height / 2);

    setIsDraggingKnife(true);

    const clampedX = Math.max(-130, Math.min(130, currentX));
    const clampedY = Math.max(-130, Math.min(75, currentY));
    setKnifePos({ x: clampedX, y: clampedY });
    checkCakeIntersection(clampedX, clampedY);
  };

  // Pointer Move: Drag Knife smoothly with requestAnimationFrame for 60fps responsiveness
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingKnife || isCutting || isCutComplete) return;
    e.preventDefault();

    const rect = arenaRectRef.current || cakeArenaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);

    const clampedX = Math.max(-130, Math.min(130, relX));
    const clampedY = Math.max(-130, Math.min(75, relY));

    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = requestAnimationFrame(() => {
      setKnifePos({ x: clampedX, y: clampedY });
      checkCakeIntersection(clampedX, clampedY);
    });
  };

  // Pointer Up: Release Knife
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    if (!isDraggingKnife) return;
    setIsDraggingKnife(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    // If not cut yet, smoothly return knife to starting position above cake
    if (!isCutting && !isCutComplete && !isCutTriggeredRef.current) {
      setKnifePos({ x: 0, y: -95 });
    }
  };

  useEffect(() => {
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center px-4 select-none">
      {/* ========================================================================= */}
      {/* STAGE 1: OPEN BUTTON (Playful Proximity & Evasive Dodging Animation) */}
      {/* ========================================================================= */}
      {stage === 'open_button' && (
        <div className="w-full flex flex-col items-center justify-center text-center animate-fadeIn">
          {/* Header Texts */}
          <div className="flex flex-col items-center justify-center mb-6 min-h-[70px]">
            <p className="font-cinzel text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.16em] text-pink-600 drop-shadow-sm transition-all duration-300">
              {currentDodgeText.title}
            </p>
            <p className="text-base sm:text-lg font-cormorant italic text-pink-500/90 tracking-wider mt-1.5 transition-all duration-300">
              {currentDodgeText.subtitle}
            </p>
          </div>

          {/* Interactive Dodging OPEN Button Arena with Proximity Tracking */}
          <div
            ref={arenaRef}
            onPointerMove={handleArenaPointerMove}
            className="relative w-full max-w-[360px] sm:max-w-[440px] h-36 flex items-center justify-center select-none"
          >
            <div
              ref={buttonRef}
              style={{
                transform: `translate3d(${buttonPos.x}px, ${buttonPos.y}px, 0)`,
                transition: isDodging
                  ? 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  : 'transform 0.25s ease-out',
              }}
              onMouseEnter={triggerDodge}
              onPointerDown={(e) => {
                if (dodgeCount < maxDodges) {
                  e.preventDefault();
                  triggerDodge();
                }
              }}
              onTouchStart={(e) => {
                if (dodgeCount < maxDodges) {
                  e.preventDefault();
                  triggerDodge();
                }
              }}
              className="relative transition-transform"
            >
              <button
                type="button"
                id="btn-open-surprise"
                onClick={handleOpenClick}
                disabled={isOpening}
                className={`group relative px-10 sm:px-14 py-4 sm:py-4.5 rounded-full font-cinzel text-base sm:text-lg font-bold tracking-[0.22em] uppercase cursor-pointer flex items-center gap-2.5 border border-rose-300/80 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.45)] hover:shadow-[0_14px_40px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 ${
                  dodgeCount >= maxDodges
                    ? 'ring-4 ring-amber-300/80 shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-pulse scale-105'
                    : isDodging
                    ? 'scale-95'
                    : ''
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                <span>{isOpening ? 'OPENING...' : dodgeCount >= maxDodges ? 'OPEN ME! 🎁' : 'OPEN'}</span>
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: CAKE CUTTING INTERACTION */}
      {/* ========================================================================= */}
      {stage === 'cake_cutting' && (
        <div className="w-full flex flex-col items-center justify-center animate-fadeIn">
          {/* 1. Header Texts */}
          <div className="text-center min-h-[85px] flex flex-col items-center justify-center mb-2">
            <p className="font-cinzel text-base sm:text-lg md:text-xl font-bold tracking-[0.14em] text-pink-600">
              Okay Dracula... one last thing 😁
            </p>

            <p className="font-cinzel text-xl sm:text-2xl md:text-3xl font-black tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-500 drop-shadow-sm mt-0.5">
              Cut the cake! 🔪🎂
            </p>

            <p className="text-xs sm:text-sm font-cormorant italic text-pink-500/90 tracking-wider mt-0.5">
              {isCutComplete
                ? 'Cake successfully cut! 🎂✨'
                : isDraggingKnife
                ? 'Drag the blade straight down through the cake! 🔪'
                : 'Hold the knife and cut the cake! 😂'}
            </p>
          </div>

          {/* 2. Interactive Cake & Knife Arena */}
          <div
            ref={cakeArenaRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-full max-w-[340px] sm:max-w-[420px] h-[270px] sm:h-[290px] rounded-3xl bg-white/45 border border-pink-200/70 shadow-[0_8px_30px_rgba(251,207,232,0.4)] backdrop-blur-sm flex items-center justify-center overflow-visible touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Soft Golden Platter Ambient Floor Shadow */}
            <div className="absolute bottom-5 w-52 sm:w-60 h-8 rounded-full bg-pink-300/30 blur-md pointer-events-none" />

            {/* A. FIXED BIRTHDAY CAKE (STAYS COMPLETELY STATIONARY IN CENTER) */}
            <div
              className={`relative select-none pointer-events-none ${
                !isCutting && !isCutComplete ? 'animate-[subtleBreathing_3.5s_ease-in-out_infinite]' : ''
              }`}
            >
              {/* Golden Scalloped Cake Platter */}
              <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 border border-amber-300/90 shadow-[0_4px_14px_rgba(245,158,11,0.25)] flex items-center justify-center">
                <div className="w-40 sm:w-48 h-2 rounded-full bg-amber-100/60" />
              </div>

              {/* TWO CAKE HALVES (SPLIT ON CUT) */}
              <div className="relative flex items-center justify-center">
                {/* LEFT CAKE HALF */}
                <div
                  className="relative transition-all duration-700 ease-out"
                  style={{
                    transform: isCutComplete ? 'translate3d(-24px, 4px, 0) rotate(-4deg)' : 'translate3d(0, 0, 0)',
                  }}
                >
                  <div className="w-20 sm:w-24 h-24 sm:h-28 rounded-l-3xl bg-gradient-to-br from-pink-300 via-rose-300 to-pink-400 border-l border-y border-pink-200 shadow-md relative overflow-hidden flex flex-col justify-between p-2">
                    {/* Strawberry Cream Drip Layer */}
                    <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-white via-pink-100 to-transparent opacity-95 rounded-tl-2xl" />
                    <div className="absolute top-6 left-2 w-3 h-4 bg-white/90 rounded-b-full" />
                    <div className="absolute top-6 left-8 w-4 h-5 bg-white/90 rounded-b-full" />

                    {/* Middle Golden Sponge Biscuit Layer */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-amber-200/90 border-y border-amber-300/70" />

                    {/* Left Strawberry Topper */}
                    <div className="relative z-10 -mt-3 self-center">
                      <div className="w-6 h-6 rounded-full bg-rose-500 shadow-sm border border-rose-300 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-200" />
                      </div>
                    </div>

                    {/* Bottom Butter Frosting Accent */}
                    <div className="relative z-10 flex gap-1 justify-start">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-100 shadow-sm" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* RIGHT CAKE HALF */}
                <div
                  className="relative transition-all duration-700 ease-out"
                  style={{
                    transform: isCutComplete ? 'translate3d(24px, 4px, 0) rotate(4deg)' : 'translate3d(0, 0, 0)',
                  }}
                >
                  <div className="w-20 sm:w-24 h-24 sm:h-28 rounded-r-3xl bg-gradient-to-bl from-pink-300 via-rose-300 to-pink-400 border-r border-y border-pink-200 shadow-md relative overflow-hidden flex flex-col justify-between p-2">
                    {/* Strawberry Cream Drip Layer */}
                    <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-white via-pink-100 to-transparent opacity-95 rounded-tr-2xl" />
                    <div className="absolute top-6 right-3 w-3 h-4 bg-white/90 rounded-b-full" />
                    <div className="absolute top-6 right-10 w-4 h-5 bg-white/90 rounded-b-full" />

                    {/* Middle Golden Sponge Biscuit Layer */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-amber-200/90 border-y border-amber-300/70" />

                    {/* Right Strawberry Topper */}
                    <div className="relative z-10 -mt-3 self-center">
                      <div className="w-6 h-6 rounded-full bg-rose-500 shadow-sm border border-rose-300 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-200" />
                      </div>
                    </div>

                    {/* Bottom Butter Frosting Accent */}
                    <div className="relative z-10 flex gap-1 justify-end">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-100 shadow-sm" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER BIRTHDAY CANDLE WITH GLOWING FLAME */}
              <div
                className={`absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-500 ${
                  isCutComplete ? 'opacity-0 scale-75' : 'opacity-100'
                }`}
              >
                {/* Glowing Candle Flame */}
                <div className="w-3.5 h-5 rounded-full bg-gradient-to-t from-orange-400 via-amber-300 to-yellow-100 shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-pulse" />
                {/* Wick */}
                <div className="w-0.5 h-2 bg-stone-700" />
                {/* Striped Candle Stick */}
                <div className="w-2.5 h-7 rounded-sm bg-gradient-to-b from-rose-200 via-white to-pink-200 border border-pink-300/80 shadow-sm" />
              </div>

              {/* DYNAMIC SCATTERED CRUMBS UPON SLICING */}
              {isCutComplete &&
                crumbs.map((crumb) => (
                  <div
                    key={crumb.id}
                    className="absolute rounded-full pointer-events-none animate-fadeIn"
                    style={{
                      left: `calc(50% + ${crumb.x}px)`,
                      top: `calc(50% + ${crumb.y}px)`,
                      width: `${crumb.size}px`,
                      height: `${crumb.size}px`,
                      backgroundColor: crumb.color,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  />
                ))}
            </div>

            {/* B. DRAGGABLE HIGH-PRECISION KNIFE */}
            <div
              style={{
                transform: `translate3d(${knifePos.x}px, ${knifePos.y}px, 0) rotate(${
                  isCutting || isCutComplete ? '0deg' : isDraggingKnife ? '-12deg' : '-22deg'
                })`,
                transition: isDraggingKnife ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className="absolute z-30 pointer-events-none flex flex-col items-center filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]"
            >
              {/* Knife Handle */}
              <div className="w-5 sm:w-6 h-14 sm:h-16 rounded-t-xl bg-gradient-to-b from-amber-800 via-amber-700 to-amber-900 border border-amber-600 shadow-inner flex flex-col items-center justify-around py-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
                <div className="w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
                <div className="w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
              </div>

              {/* Knife Bolster/Guard */}
              <div className="w-8 sm:w-9 h-2 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 rounded-xs shadow-xs border-y border-slate-400" />

              {/* Steel Cutting Blade with Gleaming Edge */}
              <div className="w-3.5 sm:w-4 h-16 sm:h-20 bg-gradient-to-r from-slate-200 via-white to-slate-300 border-x border-b border-slate-300 rounded-b-full relative overflow-hidden shadow-md flex items-center justify-center">
                {/* Shiny Metallic Light Glint */}
                <div className="absolute inset-y-0 left-1 w-1 bg-white opacity-85" />
              </div>

              {/* Floating Slice Prompt Label when Idle */}
              {!isDraggingKnife && !isCutting && !isCutComplete && (
                <div className="absolute -top-8 whitespace-nowrap px-3 py-1 rounded-full bg-rose-500 text-white text-[10px] sm:text-xs font-cinzel font-bold shadow-md animate-bounce">
                  <span>Drag me down! 🔪</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Post-Slice Celebratory Feedback / Transition Messages */}
          <div className="mt-4 min-h-[50px] flex flex-col items-center justify-center text-center">
            {successStep === 1 && (
              <p className="font-cinzel text-lg sm:text-xl font-black text-pink-600 tracking-wider animate-bounce">
                FINALLY! 😂🎂✨
              </p>
            )}

            {successStep === 2 && (
              <div className="flex flex-col items-center animate-fadeIn">
                <p className="font-cinzel text-base sm:text-lg font-bold text-rose-600 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Okay... now you&apos;re ready. Opening memories... 👀✨</span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                </p>
              </div>
            )}

            {isCutComplete && successStep >= 2 && onReopenMemories && (
              <div className="flex items-center gap-2 mt-2 animate-fadeIn">
                <button
                  type="button"
                  onClick={onReopenMemories}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white font-cinzel text-xs font-bold tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Open Memories Journey ↗</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCake}
                  className="px-3 py-2 rounded-full bg-white/80 hover:bg-white text-pink-600 border border-pink-200 font-cinzel text-xs font-semibold shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Cut Again 🔪</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
