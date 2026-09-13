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
  // STAGE 1: OPEN BUTTON INTERACTION (Directly Clickable - No Dodge, No 0/5)
  // =========================================================================
  const [isOpening, setIsOpening] = useState<boolean>(false);

  // Directly Open and transition to Stage 2 (Cake Cutting)
  const handleOpenClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isOpening) return;
    setIsOpening(true);
    soundEngine.playHoverTone();

    // Start birthday music immediately on user gesture!
    try {
      birthdayMusicPlayer.start();
      onStartMusic?.();
    } catch {
      // Audio context fallback
    }

    // Smoothly transition to Stage 2 (Cake Cutting)
    setTimeout(() => {
      setStage('cake_cutting');
    }, 400);
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

  // Pointer Down: Start Dragging Knife (cache rect to eliminate layout thrashing)
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
      {/* STAGE 1: OPEN BUTTON (Direct, Clean, No 0/5 counter) */}
      {/* ========================================================================= */}
      {stage === 'open_button' && (
        <div className="w-full flex flex-col items-center justify-center text-center animate-fadeIn">
          {/* Header Texts */}
          <div className="flex flex-col items-center justify-center mb-6">
            <p className="font-cinzel text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.16em] text-pink-600 drop-shadow-sm">
              One more surprise... 👀
            </p>
            <p className="text-base sm:text-lg font-cormorant italic text-pink-500/90 tracking-wider mt-1.5">
              Wanna see it?
            </p>
          </div>

          {/* Clean OPEN Button */}
          <div className="relative w-full max-w-[340px] sm:max-w-[400px] py-4 flex items-center justify-center select-none">
            <button
              type="button"
              id="btn-open-surprise"
              onClick={handleOpenClick}
              disabled={isOpening}
              className="group relative px-10 sm:px-14 py-4 sm:py-4.5 rounded-full font-cinzel text-base sm:text-lg font-bold tracking-[0.22em] uppercase cursor-pointer flex items-center gap-2.5 border border-rose-300/80 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.45)] hover:shadow-[0_14px_40px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
              <span>{isOpening ? 'OPENING...' : 'OPEN'}</span>
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </button>
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
                {/* === LEFT PIECE === */}
                <div
                  style={{
                    transform: isCutComplete ? 'translateX(-26px) rotate(-3.5deg)' : 'translateX(0px) rotate(0deg)',
                    transition: 'transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.15)',
                  }}
                  className="relative w-22 sm:w-26 h-32 sm:h-36 flex flex-col items-end overflow-visible select-none"
                >
                  {/* Left Candle */}
                  <div className="relative mr-5 mb-0.5 flex flex-col items-center">
                    <div className="w-3 h-4 rounded-full bg-gradient-to-t from-orange-400 via-amber-300 to-yellow-100 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
                    <div className="w-0.5 h-1 bg-gray-700" />
                    <div className="w-2.5 h-7 rounded-t-sm bg-gradient-to-b from-rose-300 via-pink-400 to-rose-300 border border-pink-200/80 shadow-sm" />
                  </div>

                  {/* Top Tier (Left) */}
                  <div className="relative w-18 sm:w-22 h-12 rounded-tl-2xl bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 border-t-2 border-l-2 border-white shadow-sm flex flex-col justify-between p-1.5 overflow-hidden">
                    <div className="flex gap-1.5 items-center">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-300" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                    </div>
                    <div className="w-full h-2.5 bg-pink-200/90 rounded-b-md" />
                  </div>

                  {/* Bottom Tier (Left) */}
                  <div className="relative w-22 sm:w-26 h-16 sm:h-18 rounded-bl-2xl bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300 border-l-2 border-b-2 border-pink-300 shadow-md p-1.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                      <span className="w-2 h-2 rounded-full bg-yellow-200 shadow-sm" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    </div>

                    {isCutComplete && (
                      <div className="absolute top-0 right-0 bottom-0 w-3.5 bg-gradient-to-r from-amber-100 via-rose-300 to-rose-500 border-r border-rose-400 flex flex-col justify-around py-1">
                        <span className="w-full h-1 bg-amber-200" />
                        <span className="w-full h-1 bg-rose-500" />
                        <span className="w-full h-1 bg-amber-200" />
                      </div>
                    )}
                  </div>
                </div>

                {/* === CENTER SEAM / SLICE HIGHLIGHT === */}
                <div className="relative w-0.5 h-32 flex items-center justify-center">
                  {isCutting && (
                    <div className="absolute inset-0 w-1 bg-white shadow-[0_0_16px_#fff] z-30 animate-pulse" />
                  )}
                </div>

                {/* === RIGHT PIECE === */}
                <div
                  style={{
                    transform: isCutComplete ? 'translateX(26px) rotate(3.5deg)' : 'translateX(0px) rotate(0deg)',
                    transition: 'transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.15)',
                  }}
                  className="relative w-22 sm:w-26 h-32 sm:h-36 flex flex-col items-start overflow-visible select-none"
                >
                  {/* Right Candle */}
                  <div className="relative ml-5 mb-0.5 flex flex-col items-center">
                    <div className="w-3 h-4 rounded-full bg-gradient-to-t from-orange-400 via-amber-300 to-yellow-100 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
                    <div className="w-0.5 h-1 bg-gray-700" />
                    <div className="w-2.5 h-7 rounded-t-sm bg-gradient-to-b from-rose-300 via-pink-400 to-rose-300 border border-pink-200/80 shadow-sm" />
                  </div>

                  {/* Top Tier (Right) */}
                  <div className="relative w-18 sm:w-22 h-12 rounded-tr-2xl bg-gradient-to-bl from-pink-100 via-rose-100 to-pink-200 border-t-2 border-r-2 border-white shadow-sm flex flex-col justify-between p-1.5 overflow-hidden">
                    <div className="flex gap-1.5 items-center self-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-300" />
                    </div>
                    <div className="w-full h-2.5 bg-pink-200/90 rounded-b-md" />
                  </div>

                  {/* Bottom Tier (Right) */}
                  <div className="relative w-22 sm:w-26 h-16 sm:h-18 rounded-br-2xl bg-gradient-to-bl from-pink-200 via-rose-200 to-pink-300 border-r-2 border-b-2 border-pink-300 shadow-md p-1.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex gap-1.5 items-center self-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span className="w-2 h-2 rounded-full bg-yellow-200 shadow-sm" />
                      <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    </div>

                    {isCutComplete && (
                      <div className="absolute top-0 left-0 bottom-0 w-3.5 bg-gradient-to-l from-amber-100 via-rose-300 to-rose-500 border-l border-rose-400 flex flex-col justify-around py-1">
                        <span className="w-full h-1 bg-amber-200" />
                        <span className="w-full h-1 bg-rose-500" />
                        <span className="w-full h-1 bg-amber-200" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* B. REALISTIC CAKE KNIFE (USER DRAGGABLE OBJECT) */}
            <div
              style={{
                transform: `translate(${knifePos.x}px, ${knifePos.y}px) ${
                  isDraggingKnife ? 'scale(1.08) rotate(-5deg)' : isCutting ? 'scale(1) rotate(0deg)' : 'scale(1) rotate(0deg)'
                }`,
                transition: isCutting
                  ? 'transform 0.38s cubic-bezier(0.2, 0.9, 0.4, 1.1)'
                  : isDraggingKnife
                  ? 'none'
                  : 'transform 0.3s ease-out',
              }}
              className={`absolute pointer-events-none z-30 flex flex-col items-center drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)] ${
                isCutComplete ? 'opacity-0 scale-75 transition-all duration-500' : 'opacity-100'
              }`}
            >
              {/* Rosewood Handle with Brass Rivets */}
              <div className="relative w-5 h-12 rounded-t-lg bg-gradient-to-b from-amber-900 via-amber-800 to-amber-950 border border-amber-950 flex flex-col items-center justify-around py-1 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
              </div>

              {/* Golden Bolster / Guard */}
              <div className="w-6 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 rounded-sm shadow-sm" />

              {/* Stainless Steel Blade pointing downwards */}
              <div
                className="w-5 h-18 bg-gradient-to-r from-slate-200 via-white to-slate-300 border-l border-r border-slate-400/90 shadow-md"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                }}
              />

              <Sparkles className="w-3.5 h-3.5 text-pink-400 -mt-1 animate-pulse" />
            </div>

            {/* C. CRUMBS & CELEBRATION PARTICLES (NO HEARTS) */}
            {isCutComplete && (
              <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
                {crumbs.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      transform: `translate(${c.x}px, ${c.y}px)`,
                      width: `${c.size}px`,
                      height: `${c.size}px`,
                      backgroundColor: c.color,
                    }}
                    className="absolute rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping"
                  />
                ))}
                <div className="flex gap-2 items-center justify-center z-40 animate-bounce">
                  <Star className="w-7 h-7 text-amber-400 fill-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]" />
                  <Sparkles className="w-8 h-8 text-pink-500 drop-shadow-[0_2px_12px_rgba(244,63,94,0.5)]" />
                  <Star className="w-7 h-7 text-amber-400 fill-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]" />
                </div>
              </div>
            )}
          </div>

          {/* 3. Post-Cut Success Sequence */}
          <div className="min-h-[60px] mt-3 flex flex-col items-center justify-center text-center">
            {successStep === 1 && (
              <p className="font-cinzel text-xl sm:text-2xl font-bold tracking-[0.16em] text-rose-600 animate-bounce">
                FINALLY! 😂✨
              </p>
            )}

            {successStep === 2 && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                <p className="font-cinzel text-base sm:text-lg font-semibold tracking-[0.14em] text-pink-600">
                  Cake sliced to perfection! 🎂✨
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onReopenMemories) {
                        onReopenMemories();
                      } else {
                        onCutSuccess();
                      }
                    }}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white font-cinzel text-xs font-bold tracking-[0.16em] uppercase shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>View Memories Journey ✨</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCake}
                    className="px-4 py-2.5 rounded-full bg-white/90 hover:bg-white text-pink-600 border border-pink-300 font-cinzel text-xs font-bold tracking-[0.14em] uppercase shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🎂 Slice Cake Again</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
