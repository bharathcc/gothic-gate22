import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Plus,
} from 'lucide-react';
import { birthdayMusicPlayer } from '../utils/birthdayMusic';

export interface SlideItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  subtitle?: string;
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 'slide-1',
    type: 'image',
    url: '/IMG_6700.PNG',
    caption: 'Cherished Memories',
    subtitle: 'A special moment that lives forever in the heart ✨',
  },
  {
    id: 'slide-2',
    type: 'image',
    url: '/IMG_6701.PNG',
    caption: 'A Celebration of You',
    subtitle: 'Wishing you all the joy, laughter, and wondrous adventures ahead 🎂',
  },
  {
    id: 'slide-3',
    type: 'image',
    url: '/IMG_6702.PNG',
    caption: 'Golden Moments & Bright Smiles',
    subtitle: 'Every second with you is a gift to cherish 🌟',
  },
  {
    id: 'slide-4',
    type: 'image',
    url: '/IMG_6703.PNG',
    caption: 'Sweetest Birthday Wishes',
    subtitle: 'May this new year bring endless happiness and boundless love 🌸',
  },
  {
    id: 'slide-5',
    type: 'image',
    url: '/IMG_6706.PNG',
    caption: 'A Favorite Story',
    subtitle: 'Moments filled with pure joy and timeless warmth 💖',
  },
  {
    id: 'slide-6',
    type: 'image',
    url: '/IMG_6712.PNG',
    caption: 'Happy Birthday Dracula',
    subtitle: 'Wishing you the happiest birthday today and always 🎈',
  },
];

interface BirthdaySurpriseSlideshowProps {
  onClose: () => void;
}

export const BirthdaySurpriseSlideshow: React.FC<BirthdaySurpriseSlideshowProps> = ({ onClose }) => {
  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Start birthday music when opened
  useEffect(() => {
    birthdayMusicPlayer.start();
    setIsMuted(birthdayMusicPlayer.getIsMuted());

    return () => {
      birthdayMusicPlayer.stop();
    };
  }, []);

  // Auto-advance slides every 5.5 seconds when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  // Hide controls after inactivity
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    handleUserActivity();
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    handleUserActivity();
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying((prev) => !prev);
    handleUserActivity();
  };

  const toggleMusic = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const muted = birthdayMusicPlayer.toggleMute();
    setIsMuted(muted);
    handleUserActivity();
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    handleUserActivity();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newSlides: SlideItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      newSlides.push({
        id: `user-slide-${Date.now()}-${i}`,
        type: isVideo ? 'video' : 'image',
        url,
        caption: file.name.replace(/\.[^/.]+$/, ''),
        subtitle: 'Custom Memory Added ✨',
      });
    }

    setSlides((prev) => [...prev, ...newSlides]);
    setCurrentIndex(slides.length); // Jump to first new uploaded slide
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div
      id="birthday-surprise-slideshow"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleUserActivity}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1f0714 0%, #0d020a 60%, #000000 100%)',
      }}
    >
      {/* Hidden File Input for adding custom photos/videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ========================================================================= */}
      {/* 1. SLIDESHOW CONTAINER (KEN BURNS ZOOM & SOFT CROSSFADE) */}
      {/* ========================================================================= */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Blurred Background Atmosphere */}
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-35 scale-110"
                style={{
                  backgroundImage: slide.type === 'image' ? `url(${slide.url})` : undefined,
                  backgroundColor: '#1f0b18',
                }}
              />

              {/* Main Media with Ken Burns Slow Zoom */}
              {slide.type === 'image' ? (
                <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12">
                  <img
                    src={slide.url}
                    alt={slide.caption}
                    className={`max-w-full max-h-[82vh] object-contain rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] border border-pink-500/20 transition-transform duration-[6000ms] ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                  />
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12">
                  <video
                    src={slide.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] border border-pink-500/20"
                  />
                </div>
              )}

              {/* Soft Gradient Overlay for Captions */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING AMBIENT SPARKLES */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-[15%] left-[8%] text-pink-300/40 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute top-[20%] right-[10%] text-rose-300/40 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute bottom-[20%] left-[12%] text-pink-300/40 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute bottom-[25%] right-[12%] text-rose-300/40 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP CONTROLS BAR (MUSIC, FULLSCREEN, ADD MEDIA, CLOSE) */}
      {/* ========================================================================= */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-6 flex items-center justify-between transition-opacity duration-500 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Soft Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-pink-400/30 text-pink-200 font-cinzel text-xs backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-pink-300" />
          <span className="tracking-[0.15em] uppercase font-medium">Surprise Moments</span>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add Photos/Videos */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Add your own photos or videos"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/60 hover:bg-black/85 border border-pink-400/40 text-pink-200 hover:text-pink-100 transition-all text-xs font-cinzel tracking-wider backdrop-blur-md cursor-pointer hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Media</span>
          </button>

          {/* Music Control */}
          <button
            type="button"
            onClick={toggleMusic}
            aria-label={isMuted ? 'Unmute birthday music' : 'Mute birthday music'}
            title={isMuted ? 'Unmute birthday music' : 'Mute birthday music'}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/85 border border-pink-400/40 text-pink-300 hover:text-pink-100 transition-all backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-pink-300 animate-pulse" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            title="Toggle fullscreen"
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/85 border border-pink-400/40 text-pink-300 hover:text-pink-100 transition-all backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close / Return Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              birthdayMusicPlayer.stop();
              onClose();
            }}
            aria-label="Close slideshow"
            title="Close slideshow"
            className="p-2.5 rounded-full bg-black/60 hover:bg-pink-950/80 border border-pink-400/40 text-pink-300 hover:text-pink-100 transition-all backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PREV & NEXT NAVIGATION ARROWS */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous slide"
        className={`absolute left-3 sm:left-6 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-pink-400/30 text-pink-200 hover:text-white transition-all backdrop-blur-md cursor-pointer hover:scale-110 active:scale-90 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Next slide"
        className={`absolute right-3 sm:right-6 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-pink-400/30 text-pink-200 hover:text-white transition-all backdrop-blur-md cursor-pointer hover:scale-110 active:scale-90 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* ========================================================================= */}
      {/* 5. BOTTOM BAR: CAPTION, PLAY/PAUSE & DOT INDICATORS */}
      {/* ========================================================================= */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-5 sm:p-8 flex flex-col items-center justify-center text-center transition-opacity duration-500 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Caption & Subtitle */}
        <div className="max-w-xl mx-auto mb-4 px-4 animate-fadeIn">
          <h3 className="font-cinzel text-lg sm:text-xl md:text-2xl font-bold tracking-[0.14em] text-pink-100 drop-shadow-[0_2px_12px_rgba(244,114,182,0.5)]">
            {currentSlide.caption}
          </h3>
          {currentSlide.subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-pink-200/80 font-light tracking-wide">
              {currentSlide.subtitle}
            </p>
          )}
        </div>

        {/* Play/Pause & Slide Dots */}
        <div className="flex items-center gap-3 sm:gap-4 px-4 py-2 rounded-full bg-black/65 border border-pink-400/30 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            className="p-1.5 rounded-full hover:bg-pink-900/40 text-pink-300 hover:text-pink-100 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(dotIdx);
                }}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  dotIdx === currentIndex
                    ? 'w-6 sm:w-8 h-2 bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]'
                    : 'w-2 h-2 bg-pink-200/40 hover:bg-pink-200/70'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] text-pink-300/80 font-mono pl-1">
            {currentIndex + 1}/{slides.length}
          </span>
        </div>
      </div>
    </div>
  );
};
