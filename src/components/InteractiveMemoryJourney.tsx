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
} from 'lucide-react';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

export interface MemoryPhoto {
  id: string;
  url: string;
}

const ALL_PHOTOS: MemoryPhoto[] = [
  { id: 'photo-1', url: '/IMG_6700.PNG' },
  { id: 'photo-2', url: '/IMG_6701.PNG' },
  { id: 'photo-3', url: '/IMG_6702.PNG' },
  { id: 'photo-4', url: '/IMG_6703.PNG' },
  { id: 'photo-5', url: '/IMG_6704.PNG' },
  { id: 'photo-6', url: '/IMG_6706.PNG' },
  { id: 'photo-7', url: '/IMG_6707.PNG' },
  { id: 'photo-8', url: '/IMG_6708.PNG' },
  { id: 'photo-9', url: '/IMG_6709.PNG' },
  { id: 'photo-10', url: '/IMG_6710.PNG' },
  { id: 'photo-11', url: '/IMG_6711.PNG' },
  { id: 'photo-12', url: '/IMG_6712.PNG' },
  { id: 'photo-13', url: '/IMG_6713.PNG' },
  { id: 'photo-14', url: '/IMG_6714.PNG' },
  { id: 'photo-15', url: '/IMG_6715.PNG' },
  { id: 'photo-16', url: '/IMG_6716.PNG' },
  { id: 'photo-17', url: '/IMG_6717.PNG' },
  { id: 'photo-18', url: '/IMG_6718.PNG' },
  { id: 'photo-19', url: '/IMG_7058.PNG' },
];

interface InteractiveMemoryJourneyProps {
  onClose?: () => void;
  onReturnToEntrance?: () => void;
}

export const InteractiveMemoryJourney: React.FC<InteractiveMemoryJourneyProps> = ({
  onClose,
  onReturnToEntrance,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(birthdayMusicPlayer.getIsMuted());
  const [selectedPhoto, setSelectedPhoto] = useState<MemoryPhoto | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Maintain continuous smooth music playback
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

  // Scroll tracking for progress indicator
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const totalScroll = scrollHeight - clientHeight;
    const progress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
    setScrollProgress(progress);
    setShowScrollTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFirstPhoto = () => {
    const firstCard = document.getElementById('photo-card-0');
    firstCard?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      id="scrolling-photo-collage"
      className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 35%, #ffe4e6 70%, #fdf2f8 100%)',
      }}
    >
      {/* 1. TOP FLOATING STICKY HEADER & PROGRESS LINE */}
      <div className="w-full bg-white/75 backdrop-blur-md border-b border-pink-200/80 sticky top-0 z-40 shadow-sm">
        {/* Continuous Scroll Progress Line */}
        <div className="w-full h-1.5 bg-pink-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <header className="px-4 sm:px-8 py-3 flex items-center justify-between max-w-6xl mx-auto w-full">
          {/* Left: Title & Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-rose-600 font-cinzel text-xs font-bold tracking-wider shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
              <span>Birthday Gallery</span>
            </span>
            <span className="hidden sm:inline text-xs text-pink-400/90 font-cinzel font-medium">
              {ALL_PHOTOS.length} Special Moments
            </span>
          </div>

          {/* Right: Audio & Close */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Unmute birthday music' : 'Mute birthday music'}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-pink-500 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Music On 🎵'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to Cake"
                className="p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-white hover:bg-rose-50 border border-pink-200 text-rose-600 transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-cinzel font-bold hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Cake</span>
              </button>
            )}
          </div>
        </header>
      </div>

      {/* 2. DOWN-SCROLLING COLLAGE CONTAINER */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 py-8 scroll-smooth"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          {/* HERO BANNER AT TOP OF SCROLL */}
          <div className="text-center mb-10 sm:mb-14 pt-2">
            <div className="flex items-center justify-center gap-2 text-pink-400 mb-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-xs font-cinzel font-bold tracking-[0.25em] uppercase text-pink-500">
                Photo Memories
              </span>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            </div>
            <h1 className="font-cinzel text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-600 to-rose-400 tracking-[0.16em] uppercase">
              HAPPY BIRTHDAY DRACULA
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-pink-400 font-cinzel tracking-wider">
              Scroll down to explore all photos ✨
            </p>

            {/* Quick Scroll Down Indicator */}
            <button
              type="button"
              onClick={scrollToFirstPhoto}
              aria-label="Scroll Down"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 hover:bg-white border border-pink-200 text-pink-500 text-xs font-cinzel font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer animate-bounce"
            >
              <span>Scroll Down</span>
              <ChevronDown className="w-3.5 h-3.5 text-pink-500" />
            </button>
          </div>

          {/* ANIMATED DOWN-SCROLLING PHOTO COLLAGE GRID */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pb-12">
            {ALL_PHOTOS.map((photo, index) => {
              // Subtle slight rotation for organic photo collage feel
              const rotationDegree = (index % 3 === 0 ? -1.2 : index % 3 === 1 ? 1.2 : -0.5);

              return (
                <div
                  key={photo.id}
                  id={`photo-card-${index}`}
                  className="group relative flex flex-col items-center"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${Math.min(index * 0.08, 1.2)}s both`,
                  }}
                >
                  {/* Glowing ambient backing */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-pink-300/30 via-rose-300/20 to-pink-300/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Clean Framed Photo Card (No hearts, no "our story" text) */}
                  <div
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative w-full bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_8px_24px_rgba(244,114,182,0.16)] hover:shadow-[0_16px_36px_rgba(244,63,94,0.28)] border border-pink-100 hover:border-pink-300/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center hover:-translate-y-1.5"
                    style={{
                      transform: `rotate(${rotationDegree}deg)`,
                    }}
                  >
                    {/* Image Box */}
                    <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl bg-pink-50/50 flex items-center justify-center">
                      <img
                        src={photo.url}
                        alt={`Birthday Memory ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = '/puzzle_photo.jpeg';
                        }}
                      />

                      {/* Hover Overlay with Zoom Icon */}
                      <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="p-2.5 rounded-full bg-white/90 text-pink-600 shadow-md transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <Maximize2 className="w-4 h-4" />
                        </span>
                      </div>
                    </div>

                    {/* Clean Minimalist Photo Numbering */}
                    <div className="w-full pt-3 flex items-center justify-between px-1">
                      <span className="text-[11px] font-cinzel font-bold tracking-widest text-pink-400/90 uppercase">
                        Photo {String(index + 1).padStart(2, '0')}
                      </span>
                      <Sparkles className="w-3 h-3 text-pink-300 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM FINALE: GRAND BIRTHDAY BANNER + EXACT 1-LINE NASA SECTION */}
          {/* ========================================================================= */}
          <div className="w-full max-w-3xl my-10 py-10 px-6 sm:px-10 rounded-3xl bg-white/90 border border-pink-200/90 shadow-[0_16px_40px_rgba(244,114,182,0.2)] text-center flex flex-col items-center">
            {/* Celebration Sparkles */}
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

            {/* EXACT REQUESTED 1-LINE NASA SECTION */}
            <div className="mt-8 px-5 py-3 rounded-full bg-pink-50/90 border border-pink-200 shadow-sm flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm text-pink-800 font-cinzel font-medium">
              <span>Do you want to know which picture was captured by NASA on your birthday? 🌌✨</span>
              <a
                href="https://science.nasa.gov/specials/apps/what-did-hubble-see-on-your-birthday/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all border border-indigo-400/50 cursor-pointer"
              >
                <Telescope className="w-3.5 h-3.5 text-amber-300" />
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
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 font-cinzel text-xs font-semibold tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
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

      {/* FLOATING SCROLL-TO-TOP BUTTON */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white/90 hover:bg-white text-pink-600 border border-pink-300 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* 4. LIGHTBOX ZOOM MODAL */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={selectedPhoto.url}
            alt="Enlarged Memory Photo"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
