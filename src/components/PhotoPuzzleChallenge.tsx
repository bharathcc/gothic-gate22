import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ArrowLeft, User, Clock, AlertTriangle, RefreshCw, Zap, ShieldAlert } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { VisitorUser } from '../types';

interface PhotoPuzzleChallengeProps {
  user: VisitorUser;
  sessionId: string;
  onPuzzleComplete: () => void;
  onReturnToEntrance: () => void;
}

interface PuzzlePiece {
  id: number;
  originalIndex: number; // 0..(totalPieces-1)
}

const TIME_LIMIT_SECONDS = 60;

export const PhotoPuzzleChallenge: React.FC<PhotoPuzzleChallengeProps> = ({
  user,
  sessionId,
  onPuzzleComplete,
  onReturnToEntrance,
}) => {
  // 1. Single Source of Truth State with SessionStorage persistence
  const [puzzleMode, setPuzzleMode] = useState<'hard' | 'easy'>(() => {
    try {
      const saved = sessionStorage.getItem('gothic_puzzle_mode');
      if (saved === 'easy' || saved === 'hard') return saved;
    } catch {
      // ignore
    }
    return 'hard';
  });

  const [hardFailedAttempts, setHardFailedAttempts] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('gothic_hard_failed_attempts');
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num)) return num;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [easyModeUnlocked, setEasyModeUnlocked] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('gothic_easy_unlocked');
      return saved === 'true';
    } catch {
      // ignore
    }
    return false;
  });

  // Dynamic grid constants based on current puzzleMode
  const isEasyMode = puzzleMode === 'easy';
  const gridSize = isEasyMode ? 3 : 6;
  const totalPieces = isEasyMode ? 9 : 36;

  // Active puzzle pieces state
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Moves & Timer State
  const [movesCount, setMovesCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_LIMIT_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Outcomes & Cinematic States
  const [showTeaser, setShowTeaser] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [isTransitioningToEasy, setIsTransitioningToEasy] = useState<boolean>(false);
  const [transitionStage, setTransitionStage] = useState<1 | 2 | 3>(1);
  const [isCinematicZooming, setIsCinematicZooming] = useState<boolean>(false);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const completionTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeTouchIndexRef = useRef<number | null>(null);
  const completionTriggeredRef = useRef<boolean>(false);
  const isHandlingFailureRef = useRef<boolean>(false);

  // Clear transition timeouts helper
  const clearTransitionTimeouts = useCallback(() => {
    transitionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    transitionTimeoutsRef.current = [];
  }, []);

  // Clear completion timeouts helper
  const clearCompletionTimeouts = useCallback(() => {
    completionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    completionTimeoutsRef.current = [];
  }, []);

  // Prevent browser viewport scrolling when dragging/swiping puzzle pieces on mobile
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', handleNativeTouchMove);
    };
  }, []);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      clearTransitionTimeouts();
      clearCompletionTimeouts();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [clearTransitionTimeouts, clearCompletionTimeouts]);

  // Synchronize state with sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('gothic_puzzle_mode', puzzleMode);
      sessionStorage.setItem('gothic_hard_failed_attempts', String(hardFailedAttempts));
      sessionStorage.setItem('gothic_easy_unlocked', String(easyModeUnlocked));
    } catch {
      // ignore
    }
  }, [puzzleMode, hardFailedAttempts, easyModeUnlocked]);

  // Robust Fisher-Yates shuffle generator
  const generateShuffledPieces = useCallback((count: number): PuzzlePiece[] => {
    const initial: PuzzlePiece[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      originalIndex: i,
    }));

    let shuffled: PuzzlePiece[] = [];
    let attempts = 0;

    do {
      shuffled = [...initial];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }

      const correctCount = shuffled.filter((p, idx) => p.originalIndex === idx).length;
      if (count === 9) {
        if (correctCount <= 1 || attempts > 20) break;
      } else {
        if (correctCount <= 2 || attempts > 25) break;
      }
      attempts++;
    } while (attempts < 35);

    return shuffled;
  }, []);

  // Timer Control Helpers
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(true);
  }, []);

  // Reusable Reset Puzzle Function supporting both resetPuzzle(6) and resetPuzzle(3)
  const resetPuzzle = useCallback(
    (size: 3 | 6) => {
      const count = size === 3 ? 9 : 36;
      const shuffled = generateShuffledPieces(count);

      // Clean up previous timer & in-flight transitions
      stopTimer();
      clearTransitionTimeouts();
      clearCompletionTimeouts();

      // Reset puzzle state
      setPieces(shuffled);
      setSelectedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setMovesCount(0);
      setTimeLeft(TIME_LIMIT_SECONDS);
      setIsCompleted(false);
      setIsFailed(false);
      setIsTransitioningToEasy(false);
      setIsCinematicZooming(false);
      setIsBlackout(false);
      completionTriggeredRef.current = false;
      isHandlingFailureRef.current = false;

      // Start fresh timer if teaser already dismissed
      if (!showTeaser) {
        startTimer();
      }
      soundEngine.playHoverTone();
    },
    [generateShuffledPieces, startTimer, stopTimer, clearTransitionTimeouts, showTeaser]
  );

  // Mount effect: Start appropriate puzzle based on initial puzzleMode
  useEffect(() => {
    const size = puzzleMode === 'easy' ? 3 : 6;
    const count = size === 3 ? 9 : 36;
    const shuffled = generateShuffledPieces(count);
    setPieces(shuffled);
    setSelectedIndex(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setMovesCount(0);
    setTimeLeft(TIME_LIMIT_SECONDS);
    setIsCompleted(false);
    setIsFailed(false);
    setIsTransitioningToEasy(false);
    setIsCinematicZooming(false);
    setIsBlackout(false);

    return () => {
      stopTimer();
      clearTransitionTimeouts();
    };
  }, []); // Run on mount only

  // Timer Interval Effect
  useEffect(() => {
    if (!isTimerRunning || isCompleted || isFailed || isTransitioningToEasy) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return 0;
        }

        if (prev <= 11 && prev > 1) {
          soundEngine.playTimerTick(true);
        } else if (prev % 10 === 0) {
          soundEngine.playTimerTick(false);
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, isCompleted, isFailed, isTransitioningToEasy]);

  // Failure & 3x3 Easy Mode Transition Handler
  useEffect(() => {
    if (timeLeft === 0 && !isCompleted && !isHandlingFailureRef.current) {
      isHandlingFailureRef.current = true;
      stopTimer();
      setSelectedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);

      // Diagnostic Logging
      console.log('Puzzle mode:', puzzleMode);
      console.log('Hard failures count before timeout:', hardFailedAttempts);

      if (puzzleMode === 'hard') {
        const newFailureCount = hardFailedAttempts + 1;
        console.log('New hard failure count:', newFailureCount);
        setHardFailedAttempts(newFailureCount);

        // Record backend analytics
        void fetch('/api/puzzle/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            moves: movesCount,
            timeTakenSeconds: TIME_LIMIT_SECONDS,
            timeRemainingSeconds: 0,
            attemptNumber: newFailureCount,
            puzzleMode: 'hard',
            hardFailedAttempts: newFailureCount,
            status: 'failed',
          }),
        });

        if (newFailureCount >= 2) {
          // CRITICAL: 2nd Hard Failure -> AUTOMATIC TRANSITION TO EASY MODE
          console.log('Switching to EASY MODE automatically after 2 failed attempts!');
          setEasyModeUnlocked(true);
          soundEngine.playFailureGong();

          // Stage 1: Freeze 6x6, show "TIME'S UP" & "THE MEMORY IS STILL LOCKED..."
          setIsTransitioningToEasy(true);
          setIsFailed(false);
          setTransitionStage(1);

          clearTransitionTimeouts();

          // Stage 2 (at 1400ms): "YOU'VE BEEN GIVEN ANOTHER CHANCE."
          const t2 = setTimeout(() => {
            console.log('Transition Stage 2: YOU\'VE BEEN GIVEN ANOTHER CHANCE');
            setTransitionStage(2);
            soundEngine.playEasyModeUnlock();
          }, 1400);
          transitionTimeoutsRef.current.push(t2);

          // Stage 3 (at 2800ms): "EASY MODE" - "You have one more path to the memory."
          const t3 = setTimeout(() => {
            console.log('Transition Stage 3: EASY MODE - You have one more path to the memory');
            setTransitionStage(3);
          }, 2800);
          transitionTimeoutsRef.current.push(t3);

          // Step 4 (at 4400ms): Automatically activate and render 3x3 Easy Mode with 60s timer and 0 moves
          const t4 = setTimeout(() => {
            console.log('Activating 3x3 Easy Mode (01:00)...');
            setPuzzleMode('easy');
            setIsTransitioningToEasy(false);

            // Directly setup 3x3 fresh pieces and timer
            const easyShuffled = generateShuffledPieces(9);
            setPieces(easyShuffled);
            setSelectedIndex(null);
            setDraggedIndex(null);
            setDragOverIndex(null);
            setMovesCount(0);
            setTimeLeft(TIME_LIMIT_SECONDS);
            setIsCompleted(false);
            setIsFailed(false);
            completionTriggeredRef.current = false;
            isHandlingFailureRef.current = false;

            startTimer();
            soundEngine.playHoverTone();
            console.log('3x3 Easy Mode active: 9 pieces loaded, timer started at 60s, moves: 0');
          }, 4400);
          transitionTimeoutsRef.current.push(t4);
        } else {
          // Failure on Attempt 1 of 6x6
          setIsFailed(true);
          soundEngine.playFailureGong();
          // Shuffle tiles for next attempt
          setPieces(generateShuffledPieces(36));
        }
      } else if (puzzleMode === 'easy') {
        // Failed 3x3 Easy Mode attempt
        console.log('Easy mode attempt timed out');
        setIsFailed(true);
        soundEngine.playFailureGong();
        setPieces(generateShuffledPieces(9));

        void fetch('/api/puzzle/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            moves: movesCount,
            timeTakenSeconds: TIME_LIMIT_SECONDS,
            timeRemainingSeconds: 0,
            puzzleMode: 'easy',
            hardFailedAttempts,
            status: 'failed',
          }),
        });
      }
    }
  }, [
    timeLeft,
    isCompleted,
    puzzleMode,
    hardFailedAttempts,
    sessionId,
    movesCount,
    stopTimer,
    startTimer,
    clearTransitionTimeouts,
    generateShuffledPieces,
  ]);

  // Check for Puzzle Solve
  useEffect(() => {
    const expectedCount = puzzleMode === 'easy' ? 9 : 36;
    if (
      pieces.length !== expectedCount ||
      isCompleted ||
      isFailed ||
      isTransitioningToEasy ||
      timeLeft <= 0 ||
      completionTriggeredRef.current
    ) {
      return;
    }

    const allSolved = pieces.every((piece, idx) => piece.originalIndex === idx);
    if (allSolved) {
      completionTriggeredRef.current = true;
      isHandlingFailureRef.current = true; // Prevent timeout failure handler from interfering
      stopTimer();
      setIsCompleted(true);
      setSelectedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);

      console.log('=== PUZZLE SOLVED ===');
      console.log('Puzzle mode:', puzzleMode);
      console.log('Navigating to Page 3');

      soundEngine.playMemoryRestored();

      const timeTaken = Math.max(1, TIME_LIMIT_SECONDS - timeLeft);

      // Record successful solve to backend
      void fetch('/api/puzzle/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          moves: movesCount,
          timeTakenSeconds: timeTaken,
          timeRemainingSeconds: timeLeft,
          puzzleMode,
          hardFailedAttempts,
          status: 'solved',
        }),
      });

      const zoomTimer = setTimeout(() => {
        setIsCinematicZooming(true);
        soundEngine.playMemoryVortex();
      }, 1400);
      completionTimeoutsRef.current.push(zoomTimer);

      const blackoutTimer = setTimeout(() => {
        setIsBlackout(true);
      }, 2200);
      completionTimeoutsRef.current.push(blackoutTimer);

      const completeTimer = setTimeout(() => {
        onPuzzleComplete();
      }, 2600);
      completionTimeoutsRef.current.push(completeTimer);
    }
  }, [
    pieces,
    puzzleMode,
    isCompleted,
    isFailed,
    isTransitioningToEasy,
    timeLeft,
    movesCount,
    sessionId,
    hardFailedAttempts,
    onPuzzleComplete,
    stopTimer,
  ]);

  // Piece Swap Mechanism
  const swapPieces = useCallback(
    (index1: number, index2: number) => {
      const currentTotal = puzzleMode === 'easy' ? 9 : 36;
      if (
        index1 === index2 ||
        index1 < 0 ||
        index2 < 0 ||
        index1 >= currentTotal ||
        index2 >= currentTotal
      ) {
        setSelectedIndex(null);
        return;
      }

      let isPlacementCorrect = false;
      setPieces((prev) => {
        if (prev.length !== currentTotal) return prev;
        const next = [...prev];
        const temp = next[index1];
        next[index1] = next[index2];
        next[index2] = temp;

        if (next[index1].originalIndex === index1 || next[index2].originalIndex === index2) {
          isPlacementCorrect = true;
        }
        return next;
      });

      setMovesCount((m) => m + 1);
      setSelectedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      soundEngine.playPieceSwap(isPlacementCorrect);
    },
    [puzzleMode]
  );

  // Click / Tap Handler
  const handlePieceClick = (index: number) => {
    if (isCompleted || isFailed || isTransitioningToEasy || timeLeft <= 0) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      soundEngine.playPieceSelect();
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
      soundEngine.playHoverTone();
    } else {
      swapPieces(selectedIndex, index);
    }
  };

  const handleAutoSolve = () => {
    if (isCompleted || isTransitioningToEasy) return;
    const total = puzzleMode === 'easy' ? 9 : 36;
    const solvedPieces: PuzzlePiece[] = Array.from({ length: total }, (_, i) => ({
      id: i,
      originalIndex: i,
    }));
    setPieces(solvedPieces);
    soundEngine.playPieceSwap(true);
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isCompleted || isFailed || isTransitioningToEasy || timeLeft <= 0) return;
    setDraggedIndex(index);
    setSelectedIndex(index);
    soundEngine.playPieceSelect();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isCompleted || isFailed || isTransitioningToEasy || timeLeft <= 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (isCompleted || isFailed || isTransitioningToEasy || timeLeft <= 0 || draggedIndex === null) {
      return;
    }
    swapPieces(draggedIndex, targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Mobile Touch Handling (supports tap-to-swap and swipe-to-swap without browser drag ghosting)
  const touchMovedRef = useRef<boolean>(false);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    if (isCompleted || isFailed || isTransitioningToEasy || timeLeft <= 0) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    activeTouchIndexRef.current = index;
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!touchStartPosRef.current || activeTouchIndexRef.current === null) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 6 || dy > 6) {
      touchMovedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      isCompleted ||
      isFailed ||
      isTransitioningToEasy ||
      timeLeft <= 0 ||
      activeTouchIndexRef.current === null
    ) {
      activeTouchIndexRef.current = null;
      touchStartPosRef.current = null;
      touchMovedRef.current = false;
      return;
    }

    const touch = e.changedTouches[0];
    const sourceIndex = activeTouchIndexRef.current;

    if (!touchMovedRef.current) {
      // Tap on mobile touch screen
      handlePieceClick(sourceIndex);
    } else if (touch) {
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const pieceContainer = targetEl?.closest('[data-puzzle-index]');
      const targetIdxStr = pieceContainer?.getAttribute('data-puzzle-index');

      if (targetIdxStr !== null && targetIdxStr !== undefined) {
        const targetIdx = parseInt(targetIdxStr, 10);
        if (!isNaN(targetIdx) && targetIdx !== sourceIndex) {
          swapPieces(sourceIndex, targetIdx);
        }
      }
    }

    activeTouchIndexRef.current = null;
    touchStartPosRef.current = null;
    touchMovedRef.current = false;
  };

  // Format seconds into MM:SS
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isUrgentTimer = timeLeft <= 10 && timeLeft > 0;

  return (
    <div
      id="page2-photo-puzzle-root"
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-black transition-colors duration-700 overscroll-none overscroll-y-none ${
        isFailed ? 'bg-[#0b0103]' : isEasyMode ? 'bg-[#030712]' : ''
      }`}
      style={{
        overscrollBehavior: 'none',
      }}
    >
      {/* 1. Page 2 Full-Screen Background Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ${
          isCinematicZooming
            ? 'brightness-20 scale-105 filter blur-[2px]'
            : isTransitioningToEasy
            ? 'brightness-15 filter grayscale-[90%]'
            : isFailed
            ? 'brightness-25 filter blur-[2px]'
            : 'brightness-100 scale-100'
        }`}
        style={{
          backgroundImage: "url('/page2_bg.png')",
        }}
      />

      {/* 2. Atmospheric Ambient Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
          isTransitioningToEasy
            ? 'bg-black/90'
            : isFailed
            ? 'bg-gradient-to-b from-red-950/60 via-black/75 to-black/95'
            : isEasyMode
            ? 'bg-gradient-to-b from-blue-950/30 via-black/35 to-black/75'
            : isCinematicZooming
            ? 'bg-black/90'
            : 'bg-gradient-to-b from-black/50 via-black/25 to-black/70'
        }`}
      />

      {/* 3. Slow Drifting Cinematic Fog & Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div
          className="absolute -inset-[50%] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15)_0%,transparent_60%)] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-1/4 left-1/5 w-1.5 h-1.5 rounded-full bg-cyan-300/50 blur-[1px] animate-bounce"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute top-2/3 right-1/4 w-2 h-2 rounded-full bg-amber-200/40 blur-[1px] animate-pulse"
          style={{ animationDuration: '5s' }}
        />
      </div>

      {/* 4. Swirling Inward Particle Vortex (during success transition) */}
      {isCinematicZooming && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.85)_80%)] animate-pulse" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-cyan-400/30 animate-ping"
            style={{ animationDuration: '1.2s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full border border-cyan-300/20 animate-ping"
            style={{ animationDuration: '1.8s' }}
          />
        </div>
      )}

      {/* 5. Top Navigation & Status Bar */}
      <header
        className={`relative z-20 w-full px-3 sm:px-8 pt-3 sm:pt-5 flex items-center justify-between pointer-events-auto transition-opacity duration-700 ${
          isCinematicZooming || isTransitioningToEasy ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playHoverTone();
              onReturnToEntrance();
            }}
            disabled={isCompleted}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 border border-slate-700/60 text-slate-300 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-all backdrop-blur-md cursor-pointer group shadow-lg disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Gates</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/65 border border-cyan-500/30 text-xs font-cinzel text-cyan-300 backdrop-blur-md">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[100px] sm:max-w-[150px] truncate">{user.name}</span>
          </div>

          {/* Difficulty & Attempt Indicator */}
          {isEasyMode ? (
            <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-cinzel text-xs tracking-wider backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>3×3 Easy Mode</span>
            </div>
          ) : (
            <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/65 border border-slate-700/60 text-slate-300 font-cinzel text-xs tracking-wider backdrop-blur-md">
              <span className="text-slate-400">Attempt: </span>
              <span className="text-amber-300 font-bold ml-0.5">
                {Math.min(2, hardFailedAttempts + 1)}{' '}
                <span className="text-slate-500 font-normal">of 2</span>
              </span>
            </div>
          )}
        </div>

        {/* Center/Right Status Indicators: Moves & Timer */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Moves Counter */}
          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/65 border border-slate-700/60 text-slate-200 font-cinzel text-xs tracking-widest backdrop-blur-md">
            <span>MOVES: </span>
            <span className="text-cyan-300 font-bold ml-1">{movesCount}</span>
          </div>

          {/* Quick Solve / Hint helper */}
          {!isCompleted && !isFailed && !showTeaser && (
            <button
              type="button"
              onClick={handleAutoSolve}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-300 font-cinzel text-[11px] sm:text-xs tracking-wider backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
              title="Auto-solve fractured puzzle"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="hidden sm:inline">Solve</span>
            </button>
          )}

          {/* 60-Second Prominent Timer */}
          {!isFailed && (
            <div
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-cinzel font-bold text-xs sm:text-sm tracking-widest backdrop-blur-md border transition-all duration-300 shadow-lg ${
                isUrgentTimer
                  ? 'bg-red-950/85 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse scale-105'
                  : isEasyMode
                  ? 'bg-emerald-950/75 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-black/75 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              }`}
            >
              <Clock
                className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${
                  isUrgentTimer
                    ? 'text-red-400 animate-spin'
                    : isEasyMode
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}
              />
              <span className="font-mono text-sm sm:text-base tracking-wider">
                {formatTimer(timeLeft)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 6. Center Puzzle Main Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-2 sm:px-4 py-2 sm:py-4 w-full max-w-4xl mx-auto">
        {/* Header Title */}
        <div
          className={`text-center mb-2 sm:mb-3 transition-all duration-700 ${
            isCinematicZooming || isTransitioningToEasy
              ? 'opacity-0 -translate-y-4'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.18em] sm:tracking-[0.25em] uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              The Fractured Truth
            </h1>
            {isEasyMode && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-cinzel text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                3&times;3 Easy Mode
              </span>
            )}
          </div>
          <p className="mt-0.5 sm:mt-1 font-cormorant text-sm sm:text-lg text-slate-300/90 italic tracking-wider">
            {isEasyMode
              ? "You've been given another chance. Reconstruct all 9 pieces within 60s."
              : 'Reconstruct all 36 pieces within 60 seconds.'}
          </p>
        </div>

        {/* Puzzle Board Container */}
        <div className="relative flex flex-col items-center">
          {/* Solved Celebration Banner */}
          {isCompleted && (
            <div
              className={`absolute -top-10 sm:-top-12 z-40 px-6 py-2 rounded-full bg-cyan-950/95 border border-cyan-400 text-cyan-200 font-cinzel-decorative text-xs sm:text-base font-bold tracking-[0.25em] shadow-[0_0_40px_rgba(56,189,248,0.9)] transition-all duration-700 ${
                isCinematicZooming ? 'opacity-0 scale-90' : 'opacity-100 animate-bounce'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                MEMORY RESTORED
                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
              </span>
            </div>
          )}

          {/* Dynamic Puzzle Grid Frame: Exclusively renders either 6x6 or 3x3 based on puzzleMode */}
          <div
            ref={gridRef}
            id="puzzle-grid-board"
            className={`puzzle-board-container relative rounded-2xl overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-700 touch-none overscroll-contain select-none ${
              isCinematicZooming
                ? 'scale-[1.2] sm:scale-[1.3] brightness-125 border-2 border-cyan-300 shadow-[0_0_100px_rgba(56,189,248,0.9)] z-40'
                : isCompleted
                ? 'border-2 border-cyan-400 shadow-[0_0_60px_rgba(56,189,248,0.7)] scale-[1.02] brightness-110'
                : isTransitioningToEasy
                ? 'border border-cyan-500/20 opacity-30 filter blur-[2px] scale-95'
                : isFailed
                ? 'border-2 border-red-500/40 opacity-40 filter blur-[2px]'
                : isEasyMode
                ? 'border-2 border-emerald-500/40 p-1.5 sm:p-2 bg-black/60 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'border border-cyan-500/30 p-1 sm:p-1.5 bg-black/50'
            }`}
            style={{
              width: isEasyMode ? 'min(90vw, 420px)' : 'min(92vw, 440px)',
              height: isEasyMode ? 'min(115vw, 520px)' : 'min(120vw, 560px)',
              touchAction: 'none',
            }}
          >
            <div
              className={`w-full h-full grid ${
                isEasyMode ? 'grid-cols-3 grid-rows-3' : 'grid-cols-6 grid-rows-6'
              } transition-all duration-500 touch-none ${
                isCompleted ? 'gap-0' : isEasyMode ? 'gap-1 sm:gap-1.5' : 'gap-0.5 sm:gap-1'
              }`}
              style={{ touchAction: 'none' }}
            >
              {pieces.map((piece, currentIdx) => {
                const isSelected = selectedIndex === currentIdx;
                const isDragOver = dragOverIndex === currentIdx;
                const isCorrectSpot = piece.originalIndex === currentIdx;

                // Slicing coordinates based on current active grid
                const origCol = piece.originalIndex % gridSize;
                const origRow = Math.floor(piece.originalIndex / gridSize);

                // Background position percentage
                const divisor = Math.max(1, gridSize - 1);
                const posX = (origCol / divisor) * 100;
                const posY = (origRow / divisor) * 100;

                const bgSizePercent = `${gridSize * 100}% ${gridSize * 100}%`;

                return (
                  <div
                    key={`${gridSize}-${piece.id}`}
                    data-puzzle-index={currentIdx}
                    onClick={() => handlePieceClick(currentIdx)}
                    onTouchStart={(e) => handleTouchStart(currentIdx, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`relative w-full h-full overflow-hidden transition-all duration-150 select-none touch-none ${
                      isCompleted
                        ? 'rounded-none cursor-default'
                        : isFailed || isTransitioningToEasy
                        ? 'rounded-sm cursor-not-allowed'
                        : isEasyMode
                        ? 'rounded-md sm:rounded-lg hover:brightness-110 active:scale-95 cursor-pointer shadow-md'
                        : 'rounded-sm sm:rounded-md hover:brightness-110 active:scale-95 cursor-pointer'
                    } ${
                      isSelected && !isCompleted && !isFailed && !isTransitioningToEasy
                        ? isEasyMode
                          ? 'ring-3 ring-emerald-400 ring-offset-2 ring-offset-black scale-[1.06] z-30 shadow-[0_0_25px_rgba(16,185,129,0.9)]'
                          : 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-black scale-[1.08] z-30 shadow-[0_0_20px_rgba(56,189,248,0.9)]'
                        : ''
                    } ${
                      isDragOver && !isCompleted && !isFailed && !isTransitioningToEasy
                        ? 'ring-2 ring-amber-400 scale-[1.04] z-20'
                        : ''
                    } ${
                      !isCompleted && !isFailed && !isTransitioningToEasy && isCorrectSpot
                        ? isEasyMode
                          ? 'border-2 border-emerald-400/50'
                          : 'border border-cyan-500/30'
                        : !isCompleted && !isFailed && !isTransitioningToEasy
                        ? 'border border-slate-700/40'
                        : ''
                    }`}
                    style={{
                      backgroundImage: "url('/puzzle_photo.jpeg')",
                      backgroundSize: bgSizePercent,
                      backgroundPosition: `${posX}% ${posY}%`,
                      backgroundRepeat: 'no-repeat',
                      WebkitUserDrag: 'none',
                      userSelect: 'none',
                      touchAction: 'none',
                    }}
                  >
                    {/* Selected piece glow */}
                    {isSelected && !isCompleted && !isFailed && !isTransitioningToEasy && (
                      <div
                        className={`absolute inset-0 pointer-events-none ${
                          isEasyMode ? 'bg-emerald-400/20' : 'bg-cyan-400/20'
                        }`}
                      />
                    )}

                    {/* Jewel indicator for correct spot */}
                    {!isCompleted && !isFailed && !isTransitioningToEasy && isCorrectSpot && (
                      <div
                        className={`absolute bottom-1 right-1 rounded-full ${
                          isEasyMode
                            ? 'w-2 h-2 bg-emerald-400/80 shadow-[0_0_8px_#34d399]'
                            : 'w-1 h-1 bg-cyan-400/60'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Radiant aura overlay on completion */}
            {isCompleted && (
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
                  isCinematicZooming
                    ? 'bg-gradient-to-t from-cyan-400/40 via-transparent to-cyan-200/40 opacity-100'
                    : 'bg-gradient-to-t from-cyan-500/20 via-transparent to-cyan-300/20 opacity-80 animate-pulse'
                }`}
              />
            )}
          </div>
        </div>

        {/* Bottom Interaction Guide */}
        <div
          className={`mt-2.5 sm:mt-3 text-center transition-opacity duration-700 ${
            isCinematicZooming || isFailed || isTransitioningToEasy ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-[10px] sm:text-xs font-cinzel text-slate-400 tracking-wider">
            {isCompleted ? (
              <span className="text-cyan-300 font-semibold animate-pulse">
                Restoring the memory stream...
              </span>
            ) : isEasyMode ? (
              <span className="text-emerald-300/90 font-medium">
                Tap or swipe to swap pieces &bull; Solve all 9 pieces to unlock the memory
              </span>
            ) : (
              <span>
                Tap or swipe to swap pieces &bull; Solve all 36 pieces before time expires
              </span>
            )}
          </p>
        </div>
      </main>

      {/* 7. Ambient Footer */}
      <footer
        className={`relative z-20 pb-2.5 text-center text-slate-400/60 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none transition-opacity duration-700 ${
          isCinematicZooming || isTransitioningToEasy ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {isEasyMode ? '3×3 Easy Memory Challenge' : '6×6 Hard Memory Challenge'} &bull; Chapter II
      </footer>

      {/* 8. DEDICATED HIGH-CONTRAST FAILURE MODAL FOR NON-TRANSITION FAILURES */}
      {isFailed && !isTransitioningToEasy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#1c060b] via-[#120306] to-[#0a0103] border-2 border-red-500/80 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(239,68,68,0.5)] flex flex-col items-center">
            {/* Glowing Icon */}
            <div className="w-14 h-14 mb-4 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-pulse">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            {/* Top Badge: TIME'S UP */}
            <div className="inline-block px-3 py-1 mb-2 rounded-full bg-red-950/80 border border-red-500/60 font-cinzel font-bold text-xs sm:text-sm text-red-400 tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              TIME'S UP
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.18em] uppercase my-2 drop-shadow-[0_2px_15px_rgba(239,68,68,0.8)]">
              {isEasyMode ? 'THE SHADOWS LINGER...' : 'THE MEMORY REMAINS LOST.'}
            </h2>

            {/* Subtext description */}
            <p className="font-cormorant text-base sm:text-lg text-slate-300 italic mb-5 leading-relaxed">
              {isEasyMode
                ? '"Even the easier path requires your utmost focus. Try once more."'
                : '"The fractured pieces dissolved back into darkness before the truth could be revealed."'}
            </p>

            {/* Hard Mode Attempt Indicator */}
            {!isEasyMode && (
              <div className="mb-5 px-3.5 py-1 rounded-lg bg-black/60 border border-slate-700/80 text-xs font-cinzel text-slate-300 tracking-wider">
                Attempt <span className="text-red-400 font-bold">{hardFailedAttempts}</span> of 2
                {hardFailedAttempts < 2 && (
                  <span className="text-slate-400 ml-1">
                    &bull; Next: Attempt {hardFailedAttempts + 1} of 2 (Final attempt before 3&times;3 Easy Mode)
                  </span>
                )}
              </div>
            )}

            {/* Prominent High-Contrast TRY AGAIN Button */}
            <button
              type="button"
              onClick={() => {
                const size = puzzleMode === 'easy' ? 3 : 6;
                resetPuzzle(size);
              }}
              className="w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-500 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_45px_rgba(239,68,68,0.9)] border border-red-400 transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw
                className="w-5 h-5 text-white animate-spin"
                style={{ animationDuration: '6s' }}
              />
              <span>TRY AGAIN</span>
            </button>
          </div>
        </div>
      )}

      {/* 8.5. TEASING PRE-START PUZZLE INTRO MODAL */}
      {showTeaser && !isCompleted && (
        <div
          id="puzzle-teasing-intro-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141e30] via-[#0d1522] to-[#070c14] border-2 border-cyan-400/60 shadow-[0_0_70px_rgba(56,189,248,0.35)] text-center">
            {/* Playful Emojis & Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 font-cinzel text-xs font-bold tracking-[0.2em] uppercase mb-4 shadow-sm">
              <span>🧩 THE "EASY" PUZZLE</span>
              <span className="text-amber-300">😏</span>
            </div>

            {/* Main Teasing Title */}
            <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-white tracking-wide mb-3 drop-shadow-[0_2px_12px_rgba(56,189,248,0.5)]">
              "Don't worry... this is a VERY easy puzzle! 😉"
            </h2>

            {/* Teasing banter */}
            <div className="p-4 rounded-2xl bg-black/60 border border-slate-700/70 text-center mb-5">
              <p className="font-cormorant text-base sm:text-lg text-cyan-100 italic mb-2 leading-relaxed font-semibold">
                "Honestly, even a sleepy toddler could assemble this in 5 seconds flat. 😂"
              </p>
              <p className="font-cormorant text-sm sm:text-base text-slate-300 italic">
                Should be total child's play for Dracula, right? Let's see if you can reconstruct the shattered memory before the 60s timer runs out! ⏳
              </p>
            </div>

            {/* Quick Playful Tips */}
            <div className="flex items-center justify-center gap-4 text-xs font-cinzel text-slate-300 mb-6">
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400">❖</span> Drag or tap to swap
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">⏱️</span> 60s timer
              </span>
            </div>

            {/* Playful Start Button */}
            <button
              type="button"
              id="btn-start-easy-teaser-puzzle"
              onClick={() => {
                soundEngine.playSuccessGateOpen();
                setShowTeaser(false);
                startTimer();
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.6)] border border-cyan-300 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>[ START THE "EASY" PUZZLE 🧩 ]</span>
            </button>
          </div>
        </div>
      )}

      {/* 9. AUTOMATIC CINEMATIC TRANSITION SEQUENCE ON 3RD HARD FAILURE */}
      {isTransitioningToEasy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-fadeIn">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0e071c] via-[#080312] to-black border-2 border-indigo-500/80 rounded-2xl p-6 sm:p-10 text-center shadow-[0_0_80px_rgba(99,102,241,0.5)] flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.8)] animate-pulse">
              <ShieldAlert className="w-8 h-8 text-indigo-300" />
            </div>

            {/* Step 1 & 2 & 3 Badges */}
            <div className="inline-block px-3 py-1 mb-2 rounded-full bg-red-950/80 border border-red-500/60 font-cinzel font-bold text-xs sm:text-sm text-red-400 tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              {transitionStage >= 3 ? 'ANOTHER CHANCE' : "TIME'S UP"}
            </div>

            <h2 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.2em] uppercase my-2 drop-shadow-[0_2px_20px_rgba(99,102,241,0.9)]">
              {transitionStage >= 3 ? 'EASY MODE' : 'THE MEMORY IS STILL LOCKED...'}
            </h2>

            {/* Step 1: Default subtext */}
            {transitionStage === 1 && (
              <p className="font-cormorant text-base sm:text-lg text-slate-300 italic my-2">
                "The fractured shadows refuse to yield..."
              </p>
            )}

            {/* Step 2: "YOU'VE BEEN GIVEN ANOTHER CHANCE." */}
            {transitionStage === 2 && (
              <div className="my-3 animate-fadeIn">
                <p className="font-cormorant text-xl sm:text-2xl text-cyan-300 font-semibold italic drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]">
                  "YOU'VE BEEN GIVEN ANOTHER CHANCE."
                </p>
              </div>
            )}

            {/* Step 3: "EASY MODE - You have one more path to the memory." */}
            {transitionStage >= 3 && (
              <div className="animate-fadeIn my-3">
                <p className="font-cormorant text-xl sm:text-2xl text-emerald-300 italic drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                  "You have one more path to the memory."
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-cinzel text-emerald-400 tracking-widest animate-pulse">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Activating 3&times;3 Easy Mode (01:00)...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. Pitch Black Transition Curtain */}
      <div
        className={`fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-500 ${
          isBlackout ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
