import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  X,
  ChevronDown,
  ArrowUp,
  Telescope,
  Maximize2,
  Sun,
  Smile,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Layers,
  Sparkle,
} from 'lucide-react';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

export interface MemoryPhoto {
  id: string;
  url: string;
  tag: string;
  title: string;
  subtitle: string;
}

// Exactly 18 real memory photos
const ALL_PHOTOS: MemoryPhoto[] = [
  {
    id: 'photo-1',
    url: '/IMG_6700.PNG',
    tag: 'Golden Sunshine',
    title: 'Laughter like Sunshine',
    subtitle: 'A radiant smile that lights up every single room with pure warmth ☀️',
  },
  {
    id: 'photo-2',
    url: '/IMG_6701.PNG',
    tag: 'Boundless Cheer',
    title: 'Bright Smiles & Pure Joy',
    subtitle: 'Bringing boundless positive energy, laughter, and endless delight 🌟',
  },
  {
    id: 'photo-3',
    url: '/IMG_6702.PNG',
    tag: 'Sparkling Light',
    title: 'Sparkling Laughter',
    subtitle: 'Unfiltered happiness and genuine moments of wondrous cheer ✨',
  },
  {
    id: 'photo-4',
    url: '/IMG_6703.PNG',
    tag: 'Radiant Grace',
    title: 'Radiant Sunshine & Grace',
    subtitle: 'Graceful moments that shine bright like the golden morning sun 🌸',
  },
  {
    id: 'photo-5',
    url: '/IMG_6704.PNG',
    tag: 'Vibrant Spirit',
    title: 'Vibrant Energy & Ambition',
    subtitle: 'Unstoppable determination, brilliance, and a dazzling smile 💫',
  },
  {
    id: 'photo-6',
    url: '/IMG_6706.PNG',
    tag: 'Warm Sunshine',
    title: 'Warmest Sunshine',
    subtitle: 'Lighting up every path with poise, laughter, and kindness 🌻',
  },
  {
    id: 'photo-7',
    url: '/IMG_6707.PNG',
    tag: 'Sweet Moments',
    title: 'Sweetest Adventures',
    subtitle: 'Delightful memories filled with wonder and timeless celebration 🎈',
  },
  {
    id: 'photo-8',
    url: '/IMG_6708.PNG',
    tag: 'Joyous Glow',
    title: 'Laughter in the Air',
    subtitle: 'When every spontaneous smile brings delight and endless laughter 🌈',
  },
  {
    id: 'photo-9',
    url: '/IMG_6709.PNG',
    tag: 'Brilliant Mind',
    title: 'Brilliant Future Doctor',
    subtitle: 'Dedication, intellect, and grace shining brighter every single year 🩺✨',
  },
  {
    id: 'photo-10',
    url: '/IMG_6710.PNG',
    tag: 'Sunlit Serenity',
    title: 'Sunlit Days & Calm',
    subtitle: 'Peaceful golden hours surrounded by gentle laughter and sunshine ☀️',
  },
  {
    id: 'photo-11',
    url: '/IMG_6711.PNG',
    tag: 'Timeless Grace',
    title: 'Timeless Elegance & Poise',
    subtitle: 'Effortless elegance and a mesmerizing, radiant presence 🌺',
  },
  {
    id: 'photo-12',
    url: '/IMG_6712.PNG',
    tag: 'Birthday Queen',
    title: 'Happy Birthday Dracula',
    subtitle: 'A grand celebration of wondrous milestones and glorious dreams 🎂',
  },
  {
    id: 'photo-13',
    url: '/IMG_6713.PNG',
    tag: 'Lively Energy',
    title: 'Lively Sparks & Laughter',
    subtitle: 'Unmatched enthusiasm and the most cheerful, contagious smile ⚡',
  },
  {
    id: 'photo-14',
    url: '/IMG_6714.PNG',
    tag: 'Endless Light',
    title: 'Endless Light & Sunshine',
    subtitle: 'Spreading joy, optimism, and warm sunshine wherever you step 🌟',
  },
  {
    id: 'photo-15',
    url: '/IMG_6715.PNG',
    tag: 'Pure Elegance',
    title: 'Charming Smiles & Poise',
    subtitle: 'A captivating smile reflecting poise, intelligence, and grace 🌷',
  },
  {
    id: 'photo-16',
    url: '/IMG_6716.PNG',
    tag: 'Golden Horizons',
    title: 'Wondrous Journeys Ahead',
    subtitle: 'Exciting new horizons and dreams coming true in full color 🚀',
  },
  {
    id: 'photo-17',
    url: '/IMG_6717.PNG',
    tag: 'Dazzling Smile',
    title: 'Dazzling Sunshine & Joy',
    subtitle: 'Unforgettable moments bathed in golden light and bright laughter 🌼',
  },
  {
    id: 'photo-18',
    url: '/IMG_6718.PNG',
    tag: 'Inspiring Grace',
    title: 'Strength, Grace & Ambition',
    subtitle: 'Inspiring everyone around you while keeping that brilliant smile 💫',
  },
];

// Helper to distribute photos into columns for continuous downward waterfall stream
const distributeIntoColumns = (items: MemoryPhoto[], numCols: number) => {
  const cols: MemoryPhoto[][] = Array.from({ length: numCols }, () => []);
  items.forEach((item, index) => {
    cols[index % numCols].push(item);
  });
  return cols;
};

interface InteractiveMemoryJourneyProps {
  onClose?: () => void;
  onReturnToEntrance?: () => void;
}

export const InteractiveMemoryJourney: React.FC<InteractiveMemoryJourneyProps> = ({
  onClose,
  onReturnToEntrance,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(birthdayMusicPlayer.getIsMuted());
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<'gentle' | 'normal' | 'swift'>('normal');
  const [viewMode, setViewMode] = useState<'waterfall' | 'grid'>('waterfall');

  const containerRef = useRef<HTMLDivElement>(null);
  const rAFScrollRef = useRef<number | null>(null);

  // Keep sweet birthday music playing
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

  // 60FPS requestAnimationFrame auto-gliding when in Grid view mode
  useEffect(() => {
    if (viewMode !== 'grid' || isPaused) {
      if (rAFScrollRef.current) {
        cancelAnimationFrame(rAFScrollRef.current);
        rAFScrollRef.current = null;
      }
      return;
    }

    const speedStep = scrollSpeed === 'gentle' ? 0.75 : scrollSpeed === 'normal' ? 1.4 : 2.4;

    const autoGlideLoop = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setIsPaused(true);
        return;
      }
      containerRef.current.scrollTop += speedStep;
      rAFScrollRef.current = requestAnimationFrame(autoGlideLoop);
    };

    rAFScrollRef.current = requestAnimationFrame(autoGlideLoop);

    return () => {
      if (rAFScrollRef.current) {
        cancelAnimationFrame(rAFScrollRef.current);
      }
    };
  }, [viewMode, isPaused, scrollSpeed]);

  // Track scroll progress in manual container
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const totalScroll = scrollHeight - clientHeight;
    const progress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
    setScrollProgress(progress);
    setShowScrollTop(scrollTop > 300);
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'ArrowRight') {
        setSelectedPhotoIndex((prev) => (prev !== null ? (prev + 1) % ALL_PHOTOS.length : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedPhotoIndex((prev) =>
          prev !== null ? (prev - 1 + ALL_PHOTOS.length) % ALL_PHOTOS.length : 0
        );
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex]);

  const selectedPhoto = selectedPhotoIndex !== null ? ALL_PHOTOS[selectedPhotoIndex] : null;

  // Split photos into 3 columns for desktop, 2 columns for mobile
  const cols3 = distributeIntoColumns(ALL_PHOTOS, 3);
  const cols2 = distributeIntoColumns(ALL_PHOTOS, 2);

  // Animation duration map based on speed setting
  const getSpeedDuration = (baseSeconds: number) => {
    if (scrollSpeed === 'gentle') return `${baseSeconds * 1.5}s`;
    if (scrollSpeed === 'swift') return `${baseSeconds * 0.65}s`;
    return `${baseSeconds}s`;
  };

  return (
    <div
      id="scrolling-photo-collage"
      className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col font-sans"
      style={{
        background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 35%, #ffe4e6 70%, #fdf2f8 100%)',
      }}
    >
      {/* 1. TOP FLOATING STICKY HEADER */}
      <div className="w-full bg-white/85 backdrop-blur-md border-b border-pink-200/80 sticky top-0 z-40 shadow-xs">
        {/* Progress Line */}
        <div className="w-full h-1 bg-pink-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 transition-all duration-150 ease-out"
            style={{ width: `${viewMode === 'grid' ? scrollProgress : 100}%` }}
          />
        </div>

        <header className="px-3 sm:px-8 py-2 sm:py-2.5 flex items-center justify-between max-w-6xl mx-auto w-full">
          {/* Left: Badge & Count */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-rose-600 font-cinzel text-xs font-bold tracking-wider shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
              <span>Memories Gallery</span>
            </span>
            <span className="hidden md:inline text-xs text-pink-400 font-cinzel font-medium">
              {ALL_PHOTOS.length} Moments
            </span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle */}
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === 'waterfall' ? 'grid' : 'waterfall'))}
              title="Toggle Waterfall Stream / Grid Collage"
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 text-xs font-cinzel font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{viewMode === 'waterfall' ? 'Stream Mode' : 'Grid Mode'}</span>
            </button>

            {/* Play/Pause Stream */}
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              title={isPaused ? 'Resume scrolling animation' : 'Pause scrolling animation'}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-cinzel font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                !isPaused
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md'
                  : 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Flowing'}</span>
            </button>

            {/* Speed Selector */}
            <div className="hidden sm:flex items-center rounded-full bg-white border border-pink-200 p-0.5 shadow-xs">
              {(['gentle', 'normal', 'swift'] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setScrollSpeed(spd)}
                  className={`px-2 py-1 rounded-full text-[10px] font-cinzel font-bold uppercase transition-all cursor-pointer ${
                    scrollSpeed === spd
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'text-pink-600 hover:bg-pink-50'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>

            {/* Music Button */}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-pink-500 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Music 🎵'}</span>
            </button>

            {/* Close / Back to Cake */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to Cake"
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-rose-50 border border-pink-200 text-rose-600 transition-all shadow-xs cursor-pointer flex items-center gap-1 text-xs font-cinzel font-bold hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cake</span>
              </button>
            )}
          </div>
        </header>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SCROLLING COLLAGE AREA */}
      {/* ========================================================================= */}
      {viewMode === 'waterfall' ? (
        /* ----------------------------------------------------------------------- */
        /* MODE A: CONTINUOUS DOWNWARD WATERFALL STREAM (INFINITE MARQUEE LOOP)     */
        /* ----------------------------------------------------------------------- */
        <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between">
          {/* Top Subtle Gradient Shade */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#fff1f2] to-transparent z-20 pointer-events-none" />

          {/* Continuous Multi-Column Waterfall Stream */}
          <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-2 overflow-hidden flex items-center justify-center">
            {/* DESKTOP 3-COLUMN CONTINUOUS STREAM */}
            <div className="hidden md:grid grid-cols-3 gap-6 w-full h-full overflow-hidden">
              {cols3.map((columnPhotos, colIndex) => {
                // Double the photos to create seamless vertical loop
                const loopedPhotos = [...columnPhotos, ...columnPhotos];
                const baseDurations = [48, 56, 42];
                const duration = getSpeedDuration(baseDurations[colIndex % baseDurations.length]);

                return (
                  <div
                    key={`col-desk-${colIndex}`}
                    className="relative h-full overflow-hidden no-scrollbar"
                  >
                    <div
                      className={`flex flex-col gap-6 ${isPaused ? 'pause-animation' : ''}`}
                      style={{
                        animation: `gothicScrollDown ${duration} linear infinite`,
                      }}
                    >
                      {loopedPhotos.map((photo, pIdx) => {
                        const globalIndex = ALL_PHOTOS.findIndex((p) => p.id === photo.id);
                        return (
                          <div
                            key={`desk-${photo.id}-${pIdx}`}
                            onClick={() => setSelectedPhotoIndex(globalIndex >= 0 ? globalIndex : 0)}
                            className="group relative bg-white p-3.5 rounded-3xl shadow-[0_8px_24px_rgba(244,114,182,0.18)] hover:shadow-[0_16px_36px_rgba(244,63,94,0.3)] border border-pink-100 hover:border-pink-300 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center hover:scale-[1.02] transform"
                          >
                            {/* Washi Tape Accent */}
                            <div className="absolute -top-2 z-20 w-14 h-3.5 bg-amber-100/90 border border-amber-300/60 rounded-xs shadow-xs transform -rotate-2" />

                            {/* Image Box */}
                            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-pink-50/50 flex items-center justify-center">
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.src = '/IMG_6700.PNG';
                                }}
                              />
                              <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                                <span className="p-2.5 rounded-full bg-white text-pink-600 shadow-md">
                                  <Maximize2 className="w-4 h-4" />
                                </span>
                              </div>
                            </div>

                            {/* Caption */}
                            <div className="w-full pt-3 flex flex-col items-start text-left px-1">
                              <div className="w-full flex items-center justify-between mb-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-rose-600 text-[10px] font-cinzel font-bold uppercase">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                  {photo.tag}
                                </span>
                              </div>
                              <h4 className="font-cinzel text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                                {photo.title}
                              </h4>
                              <p className="font-cormorant italic text-xs text-slate-500 mt-0.5 leading-snug">
                                {photo.subtitle}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MOBILE 2-COLUMN CONTINUOUS STREAM */}
            <div className="grid md:hidden grid-cols-2 gap-3.5 w-full h-full overflow-hidden">
              {cols2.map((columnPhotos, colIndex) => {
                const loopedPhotos = [...columnPhotos, ...columnPhotos];
                const baseDurations = [46, 38];
                const duration = getSpeedDuration(baseDurations[colIndex % baseDurations.length]);

                return (
                  <div
                    key={`col-mob-${colIndex}`}
                    className="relative h-full overflow-hidden no-scrollbar"
                  >
                    <div
                      className={`flex flex-col gap-4 ${isPaused ? 'pause-animation' : ''}`}
                      style={{
                        animation: `gothicScrollDown ${duration} linear infinite`,
                      }}
                    >
                      {loopedPhotos.map((photo, pIdx) => {
                        const globalIndex = ALL_PHOTOS.findIndex((p) => p.id === photo.id);
                        return (
                          <div
                            key={`mob-${photo.id}-${pIdx}`}
                            onClick={() => setSelectedPhotoIndex(globalIndex >= 0 ? globalIndex : 0)}
                            className="group relative bg-white p-2.5 rounded-2xl shadow-[0_6px_20px_rgba(244,114,182,0.18)] border border-pink-100 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center active:scale-95"
                          >
                            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl bg-pink-50/50 flex items-center justify-center">
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover select-none"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.src = '/IMG_6700.PNG';
                                }}
                              />
                            </div>
                            <div className="w-full pt-2 flex flex-col items-start text-left px-0.5">
                              <span className="text-[9px] font-cinzel font-bold text-rose-600 uppercase">
                                {photo.tag}
                              </span>
                              <h4 className="font-cinzel text-xs font-bold text-slate-800 truncate w-full">
                                {photo.title}
                              </h4>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Gradient Shade & Quick Navigation Strip */}
          <div className="relative z-20 w-full bg-white/95 backdrop-blur-md border-t border-pink-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 max-w-6xl mx-auto shadow-sm">
            {/* Left: Clear NASA Question & Link */}
            <a
              href="https://science.nasa.gov/specials/apps/what-did-hubble-see-on-your-birthday/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold shadow-xs hover:scale-105 active:scale-95 transition-all border border-indigo-400/50 cursor-pointer"
            >
              <Telescope className="w-3.5 h-3.5 text-amber-300" />
              <span>Do you want to know which picture was captured by NASA on your birthday? 🌌 ↗</span>
            </a>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="px-3 py-1 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 font-cinzel text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Grid View & Finale</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-cinzel text-xs font-bold shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <span>Cake</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------------- */
        /* MODE B: COLLAGE GRID MONTAGE WITH SMOOTH AUTO-GLIDE                     */
        /* ----------------------------------------------------------------------- */
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 py-8 scroll-smooth"
        >
          <div className="max-w-5xl mx-auto flex flex-col items-center">
            {/* HERO BANNER MATCHING HAPPY BIRTHDAY DRACULA */}
            <div className="text-center mb-8 sm:mb-12 pt-2">
              <div className="flex items-center justify-center gap-2 text-pink-400 mb-2">
                <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
                <span className="text-xs font-cinzel font-bold tracking-[0.25em] uppercase text-pink-500">
                  Laughter & Sunshine Gallery
                </span>
                <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
              </div>

              <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 tracking-[0.16em] uppercase">
                HAPPY BIRTHDAY
              </h1>
              <h2 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 tracking-[0.18em] uppercase drop-shadow-sm mt-1">
                DRACULA 🎂✨
              </h2>

              <p className="mt-3 text-xs sm:text-sm text-pink-500 font-cinzel tracking-wider flex items-center justify-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-500" />
                <span>Scroll down or tap any photo to view in high resolution ✨</span>
              </p>
            </div>

            {/* DYNAMIC POLAROID / PHOTO COLLAGE GRID */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pb-12">
              {ALL_PHOTOS.map((photo, index) => {
                const rotations = [-1.5, 1.5, -0.8, 1.2, -1.2, 0.8];
                const rotationDegree = rotations[index % rotations.length];

                return (
                  <div
                    key={photo.id}
                    id={`memory-card-${index}`}
                    className="group relative flex flex-col items-center"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${Math.min(index * 0.04, 0.8)}s both`,
                    }}
                  >
                    {/* Washi Tape Accent */}
                    <div className="absolute -top-2.5 z-20 w-16 h-4 bg-amber-100/90 border border-amber-300/60 rounded-xs shadow-xs transform -rotate-2 opacity-80 group-hover:opacity-100 transition-opacity" />

                    {/* Framed Photo Card */}
                    <div
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="relative w-full bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_8px_24px_rgba(244,114,182,0.16)] hover:shadow-[0_16px_36px_rgba(244,63,94,0.28)] border border-pink-100 hover:border-pink-300/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center hover:-translate-y-2 hover:scale-[1.02]"
                      style={{
                        transform: `rotate(${rotationDegree}deg)`,
                      }}
                    >
                      {/* Image Box */}
                      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl bg-pink-50/50 flex items-center justify-center">
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.src = '/IMG_6700.PNG';
                          }}
                        />

                        {/* Hover Zoom Icon */}
                        <div className="absolute inset-0 bg-rose-950/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="p-3 rounded-full bg-white text-pink-600 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Maximize2 className="w-5 h-5" />
                          </span>
                        </div>
                      </div>

                      {/* Captions */}
                      <div className="w-full pt-3.5 flex flex-col items-start text-left px-1">
                        <div className="w-full flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200/80 text-rose-600 text-[10px] font-cinzel font-bold tracking-wider uppercase">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            {photo.tag}
                          </span>
                          <span className="text-[10px] font-cinzel font-semibold tracking-widest text-pink-400 uppercase">
                            {String(index + 1).padStart(2, '0')} / {ALL_PHOTOS.length}
                          </span>
                        </div>

                        <h4 className="font-cinzel text-sm sm:text-base font-bold text-slate-800 group-hover:text-rose-600 transition-colors leading-snug">
                          {photo.title}
                        </h4>

                        <p className="font-cormorant italic text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                          {photo.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTTOM FINALE BANNER + EXACT 1-LINE NASA SECTION */}
            <div className="w-full max-w-3xl my-8 py-10 px-6 sm:px-10 rounded-3xl bg-white/90 border border-pink-200/90 shadow-[0_16px_40px_rgba(244,114,182,0.2)] text-center flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 text-pink-400 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase text-pink-500">
                  Grand Celebration
                </span>
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>

              <h2 className="font-cinzel text-3xl sm:text-5xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 tracking-[0.16em] mb-1">
                HAPPY BIRTHDAY
              </h2>
              <h3 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 tracking-[0.18em] drop-shadow-sm">
                DRACULA 🎂✨
              </h3>

              {/* NASA COSMIC BIRTHDAY PICTURE EXPLORER SECTION */}
              <div className="mt-8 w-full max-w-xl p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/50 shadow-[0_12px_36px_rgba(79,70,229,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-900/90 border border-indigo-400/40 text-amber-300 shadow-sm shrink-0">
                    <Telescope className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-cinzel font-bold text-indigo-100 leading-snug">
                      Do you want to know which picture was captured by NASA on your birthday? 🌌✨
                    </p>
                    <p className="text-xs font-cormorant italic text-indigo-300/90 mt-0.5">
                      Explore the cosmic galaxy image captured by the Hubble Space Telescope on your special day!
                    </p>
                  </div>
                </div>

                <a
                  href="https://science.nasa.gov/specials/apps/what-did-hubble-see-on-your-birthday/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-cinzel font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-200"
                >
                  <Telescope className="w-3.5 h-3.5 text-slate-950" />
                  <span>See Hubble Picture ↗</span>
                </a>
              </div>

              {/* Bottom Actions */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white font-cinzel text-xs font-bold tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Back to Cake</span>
                  </button>
                )}

                {onReturnToEntrance && (
                  <button
                    type="button"
                    onClick={onReturnToEntrance}
                    className="px-6 py-2.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 font-cinzel text-xs font-semibold tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Castle Entrance</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={scrollToTop}
                  className="px-4 py-2.5 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 font-cinzel text-xs font-semibold tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Top</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SCROLL-TO-TOP BUTTON (Grid Mode) */}
      {viewMode === 'grid' && showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white/90 hover:bg-white text-pink-600 border border-pink-300 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* 3. LIGHTBOX ZOOM MODAL WITH PREV / NEXT CONTROLS */}
      {/* ========================================================================= */}
      {selectedPhoto && selectedPhotoIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn select-none"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer z-50"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhotoIndex((prev) =>
                prev !== null ? (prev - 1 + ALL_PHOTOS.length) % ALL_PHOTOS.length : 0
              );
            }}
            aria-label="Previous Photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer z-50 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhotoIndex((prev) =>
                prev !== null ? (prev + 1) % ALL_PHOTOS.length : 0
              );
            }}
            aria-label="Next Photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer z-50 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Content */}
          <div
            className="flex flex-col items-center max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-h-[72vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl select-none"
            />
            <div className="mt-3.5 text-center bg-black/70 px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-md max-w-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10">
                  {selectedPhoto.tag}
                </span>
                <span className="text-[10px] font-cinzel text-slate-400">
                  {selectedPhotoIndex + 1} of {ALL_PHOTOS.length}
                </span>
              </div>
              <h4 className="font-cinzel text-base sm:text-lg font-bold text-white">
                {selectedPhoto.title}
              </h4>
              <p className="font-cormorant italic text-xs sm:text-sm text-pink-200 mt-0.5">
                {selectedPhoto.subtitle}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
