import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  RotateCcw,
  Telescope,
  Heart,
  Maximize2,
} from 'lucide-react';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

export interface MemoryPhoto {
  id: string;
  url: string;
  caption: string;
  subtitle?: string;
}

const ALL_PHOTOS: MemoryPhoto[] = [
  {
    id: 'mem-1',
    url: '/IMG_6700.PNG',
    caption: 'A moment captured forever',
    subtitle: 'Where every story begins ✨',
  },
  {
    id: 'mem-2',
    url: '/IMG_6701.PNG',
    caption: 'Golden laughter and sweet light',
    subtitle: 'Brightening every single day 💛',
  },
  {
    id: 'mem-3',
    url: '/IMG_6702.PNG',
    caption: 'Smiles that light up the entire room',
    subtitle: 'Pure warmth and happiness 😊',
  },
  {
    id: 'mem-4',
    url: '/IMG_6703.PNG',
    caption: 'Sweetest wishes and dreams',
    subtitle: 'A quiet, precious memory 🌸',
  },
  {
    id: 'mem-5',
    url: '/IMG_6704.PNG',
    caption: 'Unforgettable adventures',
    subtitle: 'Every step together is special 🌟',
  },
  {
    id: 'mem-6',
    url: '/IMG_6706.PNG',
    caption: 'Our favorite little story',
    subtitle: 'Captured in time 📖',
  },
  {
    id: 'mem-7',
    url: '/IMG_6707.PNG',
    caption: 'When time stands still',
    subtitle: 'Calm, gentle, and peaceful 🍃',
  },
  {
    id: 'mem-8',
    url: '/IMG_6708.PNG',
    caption: 'Every little detail cherished',
    subtitle: 'Making ordinary moments extraordinary ✨',
  },
  {
    id: 'mem-9',
    url: '/IMG_6709.PNG',
    caption: 'Soft sunlight and happy vibes',
    subtitle: 'Unfiltered joy ☀️',
  },
  {
    id: 'mem-10',
    url: '/IMG_6710.PNG',
    caption: 'Magic in the air',
    subtitle: 'Moments we will never forget 🎈',
  },
  {
    id: 'mem-11',
    url: '/IMG_6711.PNG',
    caption: 'Endless horizons and dreams',
    subtitle: 'Looking forward to what comes next 💫',
  },
  {
    id: 'mem-12',
    url: '/IMG_6712.PNG',
    caption: 'The heart of our journey',
    subtitle: 'Always smiling together 💖',
  },
  {
    id: 'mem-13',
    url: '/IMG_6713.PNG',
    caption: 'Sweet laughter that echoes',
    subtitle: 'The best kind of fun 😄',
  },
  {
    id: 'mem-14',
    url: '/IMG_6714.PNG',
    caption: 'Pure warmth and kindness',
    subtitle: 'A gentle soul in a loud world 🌷',
  },
  {
    id: 'mem-15',
    url: '/IMG_6715.PNG',
    caption: 'A bright and beautiful tomorrow',
    subtitle: 'Grateful for each moment 🌼',
  },
  {
    id: 'mem-16',
    url: '/IMG_6716.PNG',
    caption: 'That unforgettable smile',
    subtitle: 'Always lighting up everything ✨',
  },
  {
    id: 'mem-17',
    url: '/IMG_6717.PNG',
    caption: 'Heart of joy and cheer',
    subtitle: 'Never lose that sparkle 🌟',
  },
  {
    id: 'mem-18',
    url: '/IMG_6718.PNG',
    caption: 'Forever cherished memories',
    subtitle: 'Stored safely in our hearts 💕',
  },
  {
    id: 'mem-19',
    url: '/IMG_7058.PNG',
    caption: 'The sweetest birthday celebration',
    subtitle: 'To many more happy years ahead 🎂',
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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(birthdayMusicPlayer.getIsMuted());
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isLightbox, setIsLightbox] = useState<boolean>(false);
  const [isFinale, setIsFinale] = useState<boolean>(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Ensure birthday music keeps playing continuously without dual restart
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

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('next');

    if (currentIndex >= ALL_PHOTOS.length - 1) {
      setIsFinale(true);
      setIsAutoPlay(false);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }

    setTimeout(() => setIsAnimating(false), 320);
  }, [currentIndex, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('prev');

    if (isFinale) {
      setIsFinale(false);
      setCurrentIndex(ALL_PHOTOS.length - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }

    setTimeout(() => setIsAnimating(false), 320);
  }, [currentIndex, isAnimating, isFinale]);

  // Slideshow / Auto-play timer
  useEffect(() => {
    if (isAutoPlay && !isFinale) {
      autoPlayTimerRef.current = setTimeout(() => {
        handleNext();
      }, 4200);
    } else {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    }

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isAutoPlay, currentIndex, isFinale, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (isLightbox) {
          setIsLightbox(false);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isLightbox, onClose]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const currentPhoto = ALL_PHOTOS[currentIndex];
  const progressPercent = isFinale ? 100 : Math.round(((currentIndex + 1) / ALL_PHOTOS.length) * 100);

  return (
    <div
      id="one-by-one-memory-journey"
      className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-between select-none"
      style={{
        background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 40%, #ffe4e6 75%, #fdf2f8 100%)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP PROGRESS BAR & HEADER CONTROLS */}
      <div className="w-full">
        {/* Continuous Step Progress Line */}
        <div className="w-full h-1.5 bg-pink-100 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Top Header Bar */}
        <header className="px-4 sm:px-6 py-3 flex items-center justify-between max-w-6xl mx-auto w-full">
          {/* Left: Memory Counter & Status */}
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1 rounded-full bg-white/85 border border-pink-200/90 text-rose-600 font-cinzel text-xs font-bold tracking-wider shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              {isFinale ? (
                <span>Birthday Finale ✨</span>
              ) : (
                <span>
                  Memory {currentIndex + 1} / {ALL_PHOTOS.length}
                </span>
              )}
            </div>

            {/* Auto Play Toggle */}
            {!isFinale && (
              <button
                type="button"
                onClick={() => setIsAutoPlay((prev) => !prev)}
                aria-label={isAutoPlay ? 'Pause Slideshow' : 'Play Slideshow'}
                className={`px-3 py-1 rounded-full text-xs font-cinzel font-semibold tracking-wider transition-all duration-200 shadow-sm flex items-center gap-1 cursor-pointer ${
                  isAutoPlay
                    ? 'bg-rose-500 text-white border border-rose-400 animate-pulse'
                    : 'bg-white/80 text-pink-600 hover:bg-white border border-pink-200/80'
                }`}
              >
                {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-pink-600" />}
                <span className="hidden sm:inline">{isAutoPlay ? 'Auto Playing' : 'Slideshow'}</span>
              </button>
            )}
          </div>

          {/* Right: Audio & Close */}
          <div className="flex items-center gap-2">
            {/* Music Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Unmute birthday music' : 'Mute birthday music'}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/85 hover:bg-white border border-pink-200/90 text-pink-600 transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-pink-500 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Music On'}</span>
            </button>

            {/* Close / Back to Cake Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close memory gallery"
                className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/85 hover:bg-white border border-pink-200/90 text-pink-600 hover:text-rose-700 transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Cake</span>
              </button>
            )}
          </div>
        </header>
      </div>

      {/* 2. MAIN CENTER: ONE-BY-ONE IMAGE CARD OR FINALE */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-4xl mx-auto my-auto overflow-hidden">
        {!isFinale ? (
          /* ONE-BY-ONE PHOTO PRESENTATION */
          <div
            key={currentPhoto.id}
            className={`w-full flex flex-col items-center justify-center transition-all duration-300 ease-out transform ${
              isAnimating
                ? direction === 'next'
                  ? 'opacity-0 scale-95 translate-x-12'
                  : 'opacity-0 scale-95 -translate-x-12'
                : 'opacity-100 scale-100 translate-x-0'
            }`}
          >
            {/* Elegant Framed Photo Container */}
            <div className="relative group max-w-md sm:max-w-lg md:max-w-xl w-full flex items-center justify-center">
              {/* Soft Ambient Shadow & Glow behind picture */}
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-300/40 via-rose-300/30 to-pink-300/40 rounded-3xl blur-xl opacity-80 pointer-events-none group-hover:opacity-100 transition-opacity" />

              {/* Photo Frame */}
              <div className="relative bg-white p-3 sm:p-4 rounded-3xl shadow-[0_12px_36px_rgba(244,114,182,0.28)] border border-pink-200/80 flex flex-col items-center overflow-hidden max-h-[55vh] sm:max-h-[62vh]">
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption}
                  className="max-h-[44vh] sm:max-h-[50vh] w-auto max-w-full object-contain rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-300 select-none"
                  onClick={() => setIsLightbox(true)}
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/puzzle_photo.jpeg';
                  }}
                />

                {/* Click to Zoom Pill */}
                <button
                  type="button"
                  onClick={() => setIsLightbox(true)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/80 hover:bg-white text-pink-600 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-80 group-hover:opacity-100"
                  title="Expand to Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Captions underneath picture */}
            <div className="mt-4 sm:mt-5 text-center px-4 max-w-lg">
              <div className="flex items-center justify-center gap-2 mb-1 text-pink-400">
                <span className="w-6 h-[1px] bg-pink-300" />
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span className="w-6 h-[1px] bg-pink-300" />
              </div>
              <h3 className="font-cinzel text-lg sm:text-2xl font-bold text-rose-700 tracking-wide">
                {currentPhoto.caption}
              </h3>
              {currentPhoto.subtitle && (
                <p className="mt-0.5 text-xs sm:text-sm text-pink-500 font-cinzel tracking-wider">
                  {currentPhoto.subtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* BIRTHDAY FINALE PAGE (At the end of all 19 photos) */
          <div className="w-full flex flex-col items-center justify-center text-center py-6 px-4 animate-fadeIn">
            {/* Glowing Birthday Header */}
            <div className="flex items-center justify-center gap-2 text-pink-400/90 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />
              <span className="text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase text-pink-500">
                Grand Celebration
              </span>
              <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />
            </div>

            <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 drop-shadow-[0_4px_20px_rgba(244,63,94,0.35)] tracking-[0.15em] mb-1">
              HAPPY BIRTHDAY
            </h1>
            <h2 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 drop-shadow-[0_6px_28px_rgba(244,63,94,0.4)] tracking-[0.18em]">
              DRACULA 🎂✨
            </h2>

            <p className="mt-4 max-w-lg text-sm sm:text-base text-pink-700/90 font-cinzel font-semibold leading-relaxed tracking-wide">
              May your year ahead be as bright, joyful, and wonderful as all the beautiful memories we shared! 💖
            </p>

            {/* MINIMAL 1-LINE NASA HUBBLE BIRTHDAY SECTION */}
            <div className="mt-6 sm:mt-8 px-4 py-2.5 rounded-full bg-white/90 border border-pink-200/90 shadow-sm flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-pink-700 font-cinzel">
              <span>Do you want to know which picture was captured by NASA on your birthday?</span>
              <a
                href="https://science.nasa.gov/specials/apps/what-did-hubble-see-on-your-birthday/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all border border-indigo-400/40 cursor-pointer"
              >
                <Telescope className="w-3.5 h-3.5 text-amber-300" />
                <span>See Hubble Picture ↗</span>
              </a>
            </div>

            {/* Finale Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFinale(false);
                  setCurrentIndex(0);
                }}
                className="px-5 py-2.5 rounded-full bg-white/90 hover:bg-white border border-pink-300 text-pink-600 font-cinzel text-xs font-bold tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Photos</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-cinzel text-xs font-bold tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Back to Cake</span>
                </button>
              )}

              {onReturnToEntrance && (
                <button
                  type="button"
                  onClick={onReturnToEntrance}
                  className="px-5 py-2.5 rounded-full bg-white/80 hover:bg-white border border-pink-200 text-pink-500 font-cinzel text-xs font-semibold tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Castle Entrance</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTTOM CONTROLS & THUMBNAIL STEPPER */}
      <footer className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 flex flex-col items-center gap-3">
        {/* Navigation Arrows & Controls */}
        <div className="w-full flex items-center justify-between">
          {/* Prev Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 && !isFinale}
            aria-label="Previous Memory Photo"
            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full font-cinzel text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 shadow-sm cursor-pointer ${
              currentIndex === 0 && !isFinale
                ? 'opacity-40 cursor-not-allowed bg-white/50 text-gray-400 border border-gray-200'
                : 'bg-white/90 hover:bg-white text-pink-600 hover:text-rose-700 border border-pink-200/90 hover:scale-105 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Dots Mini Navigator */}
          {!isFinale && (
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-[280px] py-1 px-2">
              {ALL_PHOTOS.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setDirection(idx > currentIndex ? 'next' : 'prev');
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Jump to memory ${idx + 1}`}
                  className={`transition-all duration-200 rounded-full cursor-pointer ${
                    idx === currentIndex
                      ? 'w-6 h-2 bg-gradient-to-r from-rose-500 to-pink-500'
                      : 'w-2 h-2 bg-pink-200 hover:bg-pink-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label={isFinale ? 'Replay' : currentIndex === ALL_PHOTOS.length - 1 ? 'See Birthday Finale' : 'Next Memory Photo'}
            className="flex items-center gap-1.5 px-5 sm:px-7 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white font-cinzel text-xs sm:text-sm font-bold tracking-wider uppercase shadow-[0_4px_16px_rgba(244,63,94,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-rose-300/40"
          >
            <span>
              {isFinale ? 'Replay' : currentIndex === ALL_PHOTOS.length - 1 ? 'Birthday Finale ✨' : 'Next'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* 4. LIGHTBOX ZOOM VIEW */}
      {isLightbox && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsLightbox(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightbox(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={currentPhoto.url}
            alt={currentPhoto.caption}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 text-white font-cinzel text-sm sm:text-base tracking-wider text-center">
            {currentPhoto.caption}
          </p>
        </div>
      )}
    </div>
  );
};
