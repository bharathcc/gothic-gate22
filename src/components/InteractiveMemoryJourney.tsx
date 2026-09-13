import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, ChevronUp, RotateCcw, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

export interface MemoryPhoto {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
}

const DEFAULT_PHOTOS: MemoryPhoto[] = [
  // 1. Hero Reveal Photo (Section 1)
  {
    id: 'mem-1',
    url: '/IMG_6700.PNG',
    caption: 'A moment captured forever',
    alt: 'Special memory',
  },
  // 2. Floating Memory (Section 2)
  {
    id: 'mem-2',
    url: '/IMG_6701.PNG',
    caption: 'Golden laughter and sweet light',
    alt: 'Golden celebration',
  },
  // 3. Stack Photos (Section 3 - 4 items)
  {
    id: 'mem-stack-1',
    url: '/IMG_6702.PNG',
    caption: 'Smiles that light up the room',
    alt: 'Celebration smile',
  },
  {
    id: 'mem-stack-2',
    url: '/IMG_6703.PNG',
    caption: 'Sweetest wishes and dreams',
    alt: 'Sweet celebration',
  },
  {
    id: 'mem-stack-3',
    url: '/IMG_6704.PNG',
    caption: 'Unforgettable adventures',
    alt: 'Joyful moments',
  },
  {
    id: 'mem-stack-4',
    url: '/IMG_6706.PNG',
    caption: 'A favorite story',
    alt: 'Favorite memory',
  },
  // 4. Pinned Memory (Section 4)
  {
    id: 'mem-pinned',
    url: '/IMG_6707.PNG',
    caption: 'Time stands still',
    alt: 'Serene memory',
  },
  // 5. Bento Grid Photos (Section 5 - 4 items)
  {
    id: 'mem-bento-1',
    url: '/IMG_6708.PNG',
    caption: 'Every little detail',
    alt: 'Cherished highlight',
  },
  {
    id: 'mem-bento-2',
    url: '/IMG_6709.PNG',
    caption: 'Soft sunlight',
    alt: 'Light and warmth',
  },
  {
    id: 'mem-bento-3',
    url: '/IMG_6710.PNG',
    caption: 'Magic in the air',
    alt: 'Celebration warmth',
  },
  {
    id: 'mem-bento-4',
    url: '/IMG_6711.PNG',
    caption: 'Endless horizons',
    alt: 'Beautiful horizon',
  },
  // 6. Full Screen Centerpiece (Section 6)
  {
    id: 'mem-fullscreen',
    url: '/IMG_6712.PNG',
    caption: 'The heart of this journey',
    alt: 'Centerpiece portrait',
  },
  // 7. Trail Photos (Section 7 - 6 items)
  {
    id: 'mem-trail-1',
    url: '/IMG_6713.PNG',
    caption: 'Sweet laughter',
    alt: 'Memory trail 1',
  },
  {
    id: 'mem-trail-2',
    url: '/IMG_6714.PNG',
    caption: 'Pure warmth',
    alt: 'Memory trail 2',
  },
  {
    id: 'mem-trail-3',
    url: '/IMG_6715.PNG',
    caption: 'Bright tomorrow',
    alt: 'Memory trail 3',
  },
  {
    id: 'mem-trail-4',
    url: '/IMG_6716.PNG',
    caption: 'Precious smile',
    alt: 'Memory trail 4',
  },
  {
    id: 'mem-trail-5',
    url: '/IMG_6717.PNG',
    caption: 'Heart of joy',
    alt: 'Memory trail 5',
  },
  {
    id: 'mem-trail-6',
    url: '/IMG_6718.PNG',
    caption: 'Forever cherished',
    alt: 'Memory trail 6',
  },
];

interface InteractiveMemoryJourneyProps {
  onClose?: () => void;
  onReturnToEntrance?: () => void;
}

export const InteractiveMemoryJourney: React.FC<InteractiveMemoryJourneyProps> = ({
  onClose,
  onReturnToEntrance,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(birthdayMusicPlayer.getIsMuted());

  // Interactive Photo Modal State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState<boolean>(false);

  // Consolidated Section Progress State (all in one state to avoid 9 re-renders per scroll tick)
  const [progressState, setProgressState] = useState({
    scrollProgress: 0,
    s1Progress: 0,
    s2Progress: 0,
    s3Progress: 0,
    s4Progress: 0,
    s5Progress: 0,
    s6Progress: 0,
    s7Progress: 0,
    sFinalProgress: 0,
  });

  const {
    scrollProgress,
    s1Progress,
    s2Progress,
    s3Progress,
    s4Progress,
    s5Progress,
    s6Progress,
    s7Progress,
    sFinalProgress,
  } = progressState;

  // Section Refs for scroll-driven animations
  const s1Ref = useRef<HTMLDivElement>(null);
  const s2Ref = useRef<HTMLDivElement>(null);
  const s3Ref = useRef<HTMLDivElement>(null);
  const s4Ref = useRef<HTMLDivElement>(null);
  const s5Ref = useRef<HTMLDivElement>(null);
  const s6Ref = useRef<HTMLDivElement>(null);
  const s7Ref = useRef<HTMLDivElement>(null);
  const sFinalRef = useRef<HTMLDivElement>(null);
  const scrollRAFRef = useRef<number | null>(null);

  // Start / ensure music is playing
  useEffect(() => {
    if (!birthdayMusicPlayer.getIsPlaying()) {
      try {
        birthdayMusicPlayer.start();
      } catch {}
    }
    setIsMuted(birthdayMusicPlayer.getIsMuted());
  }, []);

  const toggleSound = () => {
    const muted = birthdayMusicPlayer.toggleMute();
    setIsMuted(muted);
  };

  // Open photo with smooth animation
  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index);
    setTimeout(() => {
      setIsModalAnimating(true);
    }, 20);
  };

  const closePhotoModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setSelectedPhotoIndex(null);
    }, 220);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => ((prev ?? 0) + 1) % DEFAULT_PHOTOS.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => ((prev ?? 0) - 1 + DEFAULT_PHOTOS.length) % DEFAULT_PHOTOS.length);
  };

  // Keyboard navigation for photo modal
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePhotoModal();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex]);

  // Helper to calculate how far an element is through the viewport [0..1]
  const calculateElementProgress = (elem: HTMLElement | null, startOffset = 0.85, endOffset = 0.15, winH = window.innerHeight): number => {
    if (!elem) return 0;
    const rect = elem.getBoundingClientRect();

    const startY = winH * startOffset;
    const endY = winH * endOffset;
    const current = rect.top;

    if (current >= startY) return 0;
    if (current <= endY) return 1;

    return (startY - current) / (startY - endY);
  };

  // Pinned Section Progress Calculation (Sticky container)
  const calculateStickyProgress = (elem: HTMLElement | null, winH = window.innerHeight): number => {
    if (!elem) return 0;
    const rect = elem.getBoundingClientRect();
    const totalDistance = rect.height - winH;

    if (totalDistance <= 0) return 0;
    if (rect.top > 0) return 0;
    if (rect.top < -totalDistance) return 1;

    return Math.min(1, Math.max(0, -rect.top / totalDistance));
  };

  // Ultra-Smooth Scroll Updates throttled to requestAnimationFrame
  const updateScrollCalculations = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const overallProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    const winH = window.innerHeight;

    // Calculate all values simultaneously in one pass
    const p1 = Math.min(1, Math.max(0, scrollTop / (winH * 0.75)));
    const p2 = calculateElementProgress(s2Ref.current, 0.85, 0.2, winH);
    const p3 = calculateElementProgress(s3Ref.current, 0.85, 0.25, winH);
    const p4 = calculateStickyProgress(s4Ref.current, winH);
    const p5 = calculateElementProgress(s5Ref.current, 0.85, 0.25, winH);
    const p6 = calculateElementProgress(s6Ref.current, 0.9, 0.2, winH);
    const p7 = calculateElementProgress(s7Ref.current, 0.85, 0.15, winH);
    const pFinal = calculateElementProgress(sFinalRef.current, 0.85, 0.3, winH);

    setProgressState({
      scrollProgress: overallProgress,
      s1Progress: p1,
      s2Progress: p2,
      s3Progress: p3,
      s4Progress: p4,
      s5Progress: p5,
      s6Progress: p6,
      s7Progress: p7,
      sFinalProgress: pFinal,
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRAFRef.current) return; // already queued
    scrollRAFRef.current = requestAnimationFrame(() => {
      updateScrollCalculations();
      scrollRAFRef.current = null;
    });
  }, [updateScrollCalculations]);

  // Initial calculation on mount & on window resize
  useEffect(() => {
    updateScrollCalculations();
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', handleScroll);
      if (scrollRAFRef.current) cancelAnimationFrame(scrollRAFRef.current);
    };
  }, [handleScroll, updateScrollCalculations]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden select-none bg-gradient-to-b from-[#fff5f6] via-[#fdf2f4] via-[#fce7f3] to-[#fff0f3] text-gray-800 scroll-smooth"
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP MINIMAL PROGRESS INDICATOR (Very Sleek & Translucent) */}
      {/* ========================================================================= */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-pink-100/40 backdrop-blur-sm pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 transition-all duration-75"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress * 100))}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BAR CONTROLS: BACK BUTTON & MUSIC */}
      {/* ========================================================================= */}
      <header className="fixed top-3 left-3 right-3 sm:top-5 sm:left-5 sm:right-5 z-50 flex items-center justify-between pointer-events-none">
        {/* Top-Left: Back to Cake Page */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Cake Page"
            className="pointer-events-auto px-3.5 py-2 rounded-full bg-white/85 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-pink-700 transition-all duration-200 shadow-[0_4px_16px_rgba(244,114,182,0.2)] backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-cinzel font-bold tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Cake</span>
          </button>
        )}

        {/* Top-Right: Music & Return */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute music' : 'Mute music'}
            className="px-3.5 py-2 rounded-full bg-white/85 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-pink-700 transition-all duration-200 shadow-[0_4px_16px_rgba(244,114,182,0.2)] backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold tracking-wider hover:scale-105 active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-pink-500 animate-pulse" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Music On 🎵'}</span>
          </button>
        </div>
      </header>

      {/* Ambient background soft light spheres */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(254, 205, 211, 0.7) 0%, rgba(251, 207, 232, 0.3) 50%, rgba(255, 255, 255, 0) 70%)',
          }}
        />
        <div
          className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(253, 164, 175, 0.5) 0%, rgba(255, 241, 242, 0) 70%)',
          }}
        />
        <div
          className="absolute top-[70%] left-[-10%] w-[550px] h-[550px] rounded-full blur-3xl opacity-45 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(244, 114, 182, 0.4) 0%, rgba(255, 241, 242, 0) 70%)',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. HERO INTRO / "SCROLL DOWN ↓" PROMPT */}
      {/* ========================================================================= */}
      <section className="relative min-h-[40vh] sm:min-h-[48vh] flex flex-col items-center justify-center pt-16 sm:pt-20 px-4 text-center">
        <div
          className="transition-all duration-700 ease-out flex flex-col items-center gap-3"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 12),
            transform: `translateY(-${scrollProgress * 80}px)`,
          }}
        >
          <div className="flex items-center justify-center gap-2 text-pink-400/80 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs font-cinzel font-bold tracking-[0.28em] uppercase text-pink-400/90">
              A Special Journey
            </span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <p className="text-[10px] sm:text-[11px] font-cinzel font-semibold tracking-[0.3em] uppercase text-pink-500/80 animate-pulse">
            SCROLL DOWN ↓
          </p>
          <span className="text-[10px] text-pink-400/70 font-cinzel tracking-wider">
            (Tap any photo to expand ✨)
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1 — PHOTO REVEAL */}
      {/* First photo large in center, scaling smoothly & rotating into place */}
      {/* ========================================================================= */}
      <section
        ref={s1Ref}
        className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 py-10"
      >
        <div
          className="relative max-w-lg sm:max-w-xl md:max-w-2xl w-full will-change-transform cursor-pointer group"
          onClick={() => openPhotoModal(0)}
          style={{
            transform: `scale(${0.86 + s1Progress * 0.16}) rotate(${(-3 + s1Progress * 3).toFixed(2)}deg) translateY(${(1 - s1Progress) * 35}px)`,
            opacity: Math.min(1, 0.15 + s1Progress * 0.95),
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        >
          {/* Glassmorphic Frame */}
          <div className="relative p-3 sm:p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-pink-200/60 shadow-[0_16px_45px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:shadow-[0_20px_55px_rgba(244,63,94,0.28)] group-hover:scale-[1.02] group-active:scale-[0.98]">
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-pink-50">
              <img
                src={DEFAULT_PHOTOS[0].url}
                alt={DEFAULT_PHOTOS[0].alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/25 via-transparent to-transparent pointer-events-none" />
              
              {/* Tap to expand badge */}
              <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {DEFAULT_PHOTOS[0].caption && (
              <p className="mt-3.5 text-center font-cinzel text-xs sm:text-sm font-medium tracking-[0.14em] text-pink-600/90">
                {DEFAULT_PHOTOS[0].caption}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 — FLOATING PHOTO */}
      {/* Slides in from right, slightly rotates, settles center, parallax bg */}
      {/* ========================================================================= */}
      <section
        ref={s2Ref}
        className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12 overflow-hidden"
      >
        {/* Parallax moving background aura */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-40 pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(251, 113, 133, 0.45) 0%, rgba(255, 255, 255, 0) 70%)',
            transform: `translate(${(1 - s2Progress) * -80}px, ${s2Progress * 40}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />

        <div
          className="relative max-w-md sm:max-w-lg md:max-w-xl w-full will-change-transform cursor-pointer group"
          onClick={() => openPhotoModal(1)}
          style={{
            transform: `translateX(${(1 - s2Progress) * 75}px) rotate(${((1 - s2Progress) * 6).toFixed(2)}deg) scale(${0.9 + s2Progress * 0.1})`,
            opacity: Math.min(1, s2Progress * 1.3),
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        >
          <div className="relative p-3 sm:p-4 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_18px_50px_rgba(244,114,182,0.2)] transition-all duration-300 group-hover:shadow-[0_22px_55px_rgba(244,63,94,0.28)] group-hover:scale-[1.02] group-active:scale-[0.98]">
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-pink-50">
              <img
                src={DEFAULT_PHOTOS[1].url}
                alt={DEFAULT_PHOTOS[1].alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
            {DEFAULT_PHOTOS[1].caption && (
              <p className="mt-3.5 text-center font-cinzel text-xs sm:text-sm font-medium tracking-[0.14em] text-pink-600/90">
                {DEFAULT_PHOTOS[1].caption}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3 — STACKED PHOTOS */}
      {/* Separates from a physical stack one by one across the table as she scrolls */}
      {/* ========================================================================= */}
      <section
        ref={s3Ref}
        className="relative min-h-[105vh] sm:min-h-[115vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16"
      >
        <div className="relative w-full max-w-2xl sm:max-w-3xl h-[420px] sm:h-[480px] flex items-center justify-center">
          {/* Photo 1: Moves Left (-55px) and tilts (-11deg) */}
          <div
            className="absolute w-52 sm:w-64 md:w-72 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(2)}
            style={{
              transform: `translateX(${-s3Progress * 85}px) translateY(${-s3Progress * 30}px) rotate(${(-3 - s3Progress * 9).toFixed(2)}deg) scale(${0.92 + s3Progress * 0.08})`,
              zIndex: 10,
              opacity: Math.min(1, 0.4 + s3Progress * 0.65),
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_12px_30px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_36px_rgba(244,63,94,0.25)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[2].url}
                  alt="Stack 1"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Photo 2: Moves Right (+85px) and tilts (+10deg) */}
          <div
            className="absolute w-52 sm:w-64 md:w-72 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(3)}
            style={{
              transform: `translateX(${s3Progress * 85}px) translateY(${s3Progress * 25}px) rotate(${(2 + s3Progress * 8).toFixed(2)}deg) scale(${0.92 + s3Progress * 0.08})`,
              zIndex: 12,
              opacity: Math.min(1, 0.4 + s3Progress * 0.65),
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_12px_30px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_36px_rgba(244,63,94,0.25)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[3].url}
                  alt="Stack 2"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Photo 3: Moves Upward (-55px) */}
          <div
            className="absolute w-48 sm:w-60 md:w-68 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(4)}
            style={{
              transform: `translateY(${-s3Progress * 55}px) rotate(${(-1 + s3Progress * 3).toFixed(2)}deg) scale(${0.9 + s3Progress * 0.08})`,
              zIndex: 8,
              opacity: Math.min(1, 0.3 + s3Progress * 0.7),
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/85 backdrop-blur-md border border-pink-200/70 shadow-[0_10px_28px_rgba(244,114,182,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_36px_rgba(244,63,94,0.25)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[4].url}
                  alt="Stack 3"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Photo 4: Comes Forward into Center Front */}
          <div
            className="absolute w-56 sm:w-72 md:w-80 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(5)}
            style={{
              transform: `scale(${0.96 + s3Progress * 0.12}) rotate(${((1 - s3Progress) * 4).toFixed(2)}deg)`,
              zIndex: 20,
              opacity: Math.min(1, 0.5 + s3Progress * 0.55),
              transition: 'transform 0.12s ease-out',
            }}
          >
            <div className="p-3 sm:p-3.5 rounded-3xl bg-white/95 backdrop-blur-xl border border-pink-300/80 shadow-[0_20px_50px_rgba(244,63,94,0.22)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_24px_60px_rgba(244,63,94,0.32)]">
              <div className="overflow-hidden rounded-2xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[5].url}
                  alt="Stack 4"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/85 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="mt-2.5 text-center font-cinzel text-[11px] sm:text-xs font-semibold tracking-[0.14em] text-pink-600">
                {DEFAULT_PHOTOS[5].caption}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 — PINNED MEMORY */}
      {/* Fixed background, photo slowly zooms and moves left->center->right, soft text */}
      {/* ========================================================================= */}
      <section
        ref={s4Ref}
        className="relative min-h-[160vh] w-full"
      >
        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
          {/* Subtle Ambient Radial Light */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(255, 228, 230, 0.7) 0%, rgba(253, 242, 248, 0) 70%)',
            }}
          />

          <div
            className="relative max-w-lg sm:max-w-xl md:max-w-2xl w-full will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(6)}
            style={{
              transform: `translateX(${(-0.35 + s4Progress * 0.7) * 90}px) scale(${1.0 + s4Progress * 0.12})`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <div className="p-3 sm:p-4 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_20px_55px_rgba(244,114,182,0.2)] transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_24px_65px_rgba(244,63,94,0.3)]">
              <div className="overflow-hidden rounded-2xl aspect-[16/10] bg-pink-50 relative">
                <img
                  src={DEFAULT_PHOTOS[6].url}
                  alt="Pinned memory"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Minimal poetic line: "some memories deserve a little more time..." */}
          <div
            className="mt-6 sm:mt-8 max-w-md text-center will-change-transform"
            style={{
              opacity: Math.min(1, Math.max(0, (s4Progress - 0.15) * 2.2)),
              transform: `translateY(${(1 - s4Progress) * 15}px)`,
              transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
            }}
          >
            <p className="font-cinzel text-xs sm:text-sm md:text-base font-light italic tracking-[0.16em] text-pink-600/90 drop-shadow-sm">
              &ldquo;some memories deserve a little more time...&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 — BENTO PHOTO GRID */}
      {/* Modern asymmetric 2026 grid with multi-directional reveals */}
      {/* ========================================================================= */}
      <section
        ref={s5Ref}
        className="relative min-h-[90vh] sm:min-h-[100vh] flex flex-col items-center justify-center px-4 sm:px-8 py-16"
      >
        <div className="w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5">
            {/* Bento Card 1: Large Left (span 7) */}
            <div
              className="sm:col-span-7 will-change-transform cursor-pointer group"
              onClick={() => openPhotoModal(7)}
              style={{
                transform: `translateX(${(1 - s5Progress) * -45}px) scale(${0.92 + s5Progress * 0.08})`,
                opacity: Math.min(1, s5Progress * 1.4),
                transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
              }}
            >
              <div className="p-3 sm:p-3.5 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_14px_40px_rgba(244,114,182,0.16)] h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_20px_50px_rgba(244,63,94,0.25)]">
                <div className="overflow-hidden rounded-2xl aspect-[4/3] sm:aspect-[4/3.2] bg-pink-50 relative">
                  <img
                    src={DEFAULT_PHOTOS[7].url}
                    alt="Bento 1"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Right Column (span 5) */}
            <div className="sm:col-span-5 flex flex-col gap-4 sm:gap-5">
              {/* Bento Card 2: Small Top-Right */}
              <div
                className="will-change-transform cursor-pointer group"
                onClick={() => openPhotoModal(8)}
                style={{
                  transform: `translateY(${(1 - s5Progress) * -35}px) scale(${0.9 + s5Progress * 0.1})`,
                  opacity: Math.min(1, s5Progress * 1.5),
                  transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
                }}
              >
                <div className="p-2.5 sm:p-3 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_14px_40px_rgba(244,114,182,0.16)] transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-[0_18px_45px_rgba(244,63,94,0.25)]">
                  <div className="overflow-hidden rounded-2xl aspect-[16/10] bg-pink-50 relative">
                    <img
                      src={DEFAULT_PHOTOS[8].url}
                      alt="Bento 2"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                      <Maximize2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bento Card 3: Small Bottom-Right */}
              <div
                className="will-change-transform cursor-pointer group"
                onClick={() => openPhotoModal(9)}
                style={{
                  transform: `translateX(${(1 - s5Progress) * 35}px) scale(${0.9 + s5Progress * 0.1})`,
                  opacity: Math.min(1, s5Progress * 1.5),
                  transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
                }}
              >
                <div className="p-2.5 sm:p-3 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_14px_40px_rgba(244,114,182,0.16)] transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-[0_18px_45px_rgba(244,63,94,0.25)]">
                  <div className="overflow-hidden rounded-2xl aspect-[16/10] bg-pink-50 relative">
                    <img
                      src={DEFAULT_PHOTOS[9].url}
                      alt="Bento 3"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                      <Maximize2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Full Wide Bottom (span 12) */}
            <div
              className="sm:col-span-12 will-change-transform cursor-pointer group"
              onClick={() => openPhotoModal(10)}
              style={{
                transform: `translateY(${(1 - s5Progress) * 40}px) scale(${0.94 + s5Progress * 0.06})`,
                opacity: Math.min(1, (s5Progress - 0.1) * 1.5),
                transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
              }}
            >
              <div className="p-3 sm:p-3.5 rounded-3xl bg-white/85 backdrop-blur-xl border border-pink-200/70 shadow-[0_14px_40px_rgba(244,114,182,0.16)] transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_20px_50px_rgba(244,63,94,0.25)]">
                <div className="overflow-hidden rounded-2xl aspect-[21/9] bg-pink-50 relative">
                  <img
                    src={DEFAULT_PHOTOS[10].url}
                    alt="Bento 4"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6 — FULL-SCREEN PHOTO */}
      {/* Special photo expanding almost full screen with subtle cinematic zoom */}
      {/* ========================================================================= */}
      <section
        ref={s6Ref}
        className="relative min-h-[90vh] sm:min-h-[105vh] flex flex-col items-center justify-center px-3 sm:px-6 py-12"
      >
        <div
          className="relative will-change-transform mx-auto cursor-pointer group"
          onClick={() => openPhotoModal(11)}
          style={{
            width: `${68 + s6Progress * 24}vw`,
            maxWidth: '1200px',
            transform: `scale(${0.94 + s6Progress * 0.08})`,
            opacity: Math.min(1, 0.2 + s6Progress * 0.9),
            transition: 'width 0.1s ease-out, transform 0.1s ease-out',
          }}
        >
          <div className="p-3 sm:p-4 md:p-5 rounded-3xl bg-white/90 backdrop-blur-2xl border border-pink-200/80 shadow-[0_24px_70px_rgba(244,63,94,0.22)] transition-all duration-300 group-hover:shadow-[0_28px_80px_rgba(244,63,94,0.35)] group-hover:scale-[1.01]">
            <div className="relative overflow-hidden rounded-2xl aspect-[16/10] sm:aspect-[16/9] bg-pink-50">
              <img
                src={DEFAULT_PHOTOS[11].url}
                alt="Fullscreen centerpiece"
                className="w-full h-full object-cover will-change-transform"
                style={{
                  transform: `scale(${1.0 + s6Progress * 0.08})`,
                  transition: 'transform 0.1s ease-out',
                }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/30 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-md text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7 — PHOTO TRAIL */}
      {/* Vertical stream of smaller memory cards with distinct rotations */}
      {/* ========================================================================= */}
      <section
        ref={s7Ref}
        className="relative min-h-[110vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16"
      >
        {/* Subtle Central Glowing Vertical Line */}
        <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-pink-300/40 to-transparent -z-10" />

        <div className="w-full max-w-xl flex flex-col gap-10 sm:gap-14">
          {/* Trail Item 1: Left */}
          <div
            className="self-start w-52 sm:w-64 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(12)}
            style={{
              transform: `translateX(${(1 - s7Progress) * -40}px) rotate(-4deg)`,
              opacity: Math.min(1, s7Progress * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_10px_25px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_35px_rgba(244,63,94,0.28)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[12].url}
                  alt="Trail 1"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Trail Item 2: Right */}
          <div
            className="self-end w-52 sm:w-64 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(13)}
            style={{
              transform: `translateX(${(1 - s7Progress) * 40}px) rotate(5deg)`,
              opacity: Math.min(1, (s7Progress - 0.1) * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_10px_25px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_35px_rgba(244,63,94,0.28)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[13].url}
                  alt="Trail 2"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Trail Item 3: Left */}
          <div
            className="self-start w-52 sm:w-64 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(14)}
            style={{
              transform: `translateX(${(1 - s7Progress) * -35}px) rotate(-2deg)`,
              opacity: Math.min(1, (s7Progress - 0.2) * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_10px_25px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_35px_rgba(244,63,94,0.28)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[14].url}
                  alt="Trail 3"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Trail Item 4: Right */}
          <div
            className="self-end w-52 sm:w-64 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(15)}
            style={{
              transform: `translateX(${(1 - s7Progress) * 35}px) rotate(3deg)`,
              opacity: Math.min(1, (s7Progress - 0.25) * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_10px_25px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_35px_rgba(244,63,94,0.28)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[15].url}
                  alt="Trail 4"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Trail Item 5: Left */}
          <div
            className="self-start w-52 sm:w-64 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(16)}
            style={{
              transform: `translateX(${(1 - s7Progress) * -35}px) rotate(-3deg)`,
              opacity: Math.min(1, (s7Progress - 0.3) * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-pink-200/80 shadow-[0_10px_25px_rgba(244,114,182,0.18)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_16px_35px_rgba(244,63,94,0.28)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[16].url}
                  alt="Trail 5"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Trail Item 6: Center Highlight */}
          <div
            className="self-center w-56 sm:w-72 will-change-transform cursor-pointer group"
            onClick={() => openPhotoModal(17)}
            style={{
              transform: `scale(${0.92 + s7Progress * 0.1}) rotate(1deg)`,
              opacity: Math.min(1, (s7Progress - 0.35) * 1.5),
              transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
            }}
          >
            <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-pink-300/80 shadow-[0_14px_35px_rgba(244,63,94,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_18px_45px_rgba(244,63,94,0.32)]">
              <div className="overflow-hidden rounded-xl aspect-[4/3] relative">
                <img
                  src={DEFAULT_PHOTOS[17].url}
                  alt="Trail 6"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-white/85 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="mt-2.5 text-center font-cinzel text-[11px] sm:text-xs font-semibold tracking-[0.14em] text-pink-600">
                {DEFAULT_PHOTOS[17].caption}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FINAL SECTION */}
      {/* Screen becomes very soft & minimal, revealing "HAPPY BIRTHDAY" & "DRACULA" */}
      {/* ========================================================================= */}
      <section
        ref={sFinalRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center py-20"
      >
        {/* Soft Warm Radial Ambient Glow */}
        <div
          className="absolute inset-0 max-w-2xl mx-auto my-auto h-96 rounded-full blur-3xl opacity-70 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(254, 205, 211, 0.9) 0%, rgba(251, 207, 232, 0.45) 50%, rgba(255, 241, 242, 0) 75%)',
          }}
        />

        <div
          className="relative flex flex-col items-center justify-center space-y-4 sm:space-y-6 will-change-transform"
          style={{
            opacity: Math.min(1, sFinalProgress * 1.4),
            transform: `translateY(${(1 - sFinalProgress) * 35}px) scale(${0.94 + sFinalProgress * 0.06})`,
            transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
          }}
        >
          <div className="flex items-center justify-center gap-2 text-pink-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-cinzel font-semibold tracking-[0.24em] uppercase text-pink-400/90 flex items-center gap-1.5">
              Once Again <span className="normal-case tracking-normal">😁😆</span>
            </span>
            <Sparkles className="w-4 h-4" />
          </div>

          <h2
            className="font-cinzel text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 drop-shadow-[0_2px_14px_rgba(244,114,182,0.35)]"
          >
            HAPPY BIRTHDAY
          </h2>

          <h3
            className="font-cinzel text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 drop-shadow-[0_4px_24px_rgba(244,63,94,0.32)]"
          >
            DRACULA
          </h3>

          {/* Delicate Divider */}
          <div className="pt-2 flex items-center justify-center gap-3 opacity-80">
            <span className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-r from-transparent to-pink-300 rounded-full" />
            <span className="w-2 h-2 rounded-full bg-pink-400/80 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
            <span className="w-12 sm:w-20 h-[1.5px] bg-gradient-to-l from-transparent to-pink-300 rounded-full" />
          </div>

          {/* Minimal Action Buttons */}
          <div className="pt-8 flex flex-col sm:flex-row items-center gap-3.5">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-500 hover:text-pink-600 font-cinzel text-xs font-bold tracking-[0.18em] uppercase shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>

            {onReturnToEntrance && (
              <button
                type="button"
                onClick={onReturnToEntrance}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 hover:bg-white border border-pink-200/90 text-pink-500 hover:text-pink-600 font-cinzel text-xs font-bold tracking-[0.18em] uppercase shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Castle Entrance</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. ANIMATED PHOTO EXPAND MODAL / LIGHTBOX */}
      {/* ========================================================================= */}
      {selectedPhotoIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closePhotoModal}
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 ${
            isModalAnimating
              ? 'bg-black/80 backdrop-blur-md opacity-100'
              : 'bg-black/0 backdrop-blur-none opacity-0'
          }`}
        >
          {/* Top Control Bar inside modal */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closePhotoModal();
              }}
              aria-label="Close photo"
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white border border-white/30 backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow */}
          <button
            type="button"
            onClick={prevPhoto}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-6 z-20 p-2.5 sm:p-3 rounded-full bg-white/20 hover:bg-white/40 text-white border border-white/30 backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={nextPhoto}
            aria-label="Next photo"
            className="absolute right-2 sm:right-6 z-20 p-2.5 sm:p-3 rounded-full bg-white/20 hover:bg-white/40 text-white border border-white/30 backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Centered Modal Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center transition-all duration-300 ease-out transform ${
              isModalAnimating
                ? 'scale-100 opacity-100 translate-y-0'
                : 'scale-90 opacity-0 translate-y-6'
            }`}
          >
            <div className="relative p-2.5 sm:p-4 rounded-3xl bg-white/95 backdrop-blur-2xl border border-pink-200/80 shadow-[0_25px_70px_rgba(244,63,94,0.35)] flex flex-col items-center max-h-[85vh]">
              <div className="relative overflow-hidden rounded-2xl max-h-[72vh] flex items-center justify-center bg-pink-50/50">
                <img
                  src={DEFAULT_PHOTOS[selectedPhotoIndex].url}
                  alt={DEFAULT_PHOTOS[selectedPhotoIndex].alt || 'Expanded memory'}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Caption & Counter Footer */}
              <div className="mt-3.5 w-full px-2 flex items-center justify-between text-pink-600 gap-4">
                <div className="flex items-center gap-1.5 font-cinzel text-xs font-semibold tracking-wider text-pink-500/80">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Photo {selectedPhotoIndex + 1} of {DEFAULT_PHOTOS.length}
                  </span>
                </div>

                <p className="font-cinzel text-xs sm:text-sm font-medium tracking-[0.12em] text-pink-700 text-right truncate">
                  {DEFAULT_PHOTOS[selectedPhotoIndex].caption || 'Cherished moment'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
