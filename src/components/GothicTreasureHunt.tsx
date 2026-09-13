import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowLeft,
  RotateCcw,
  User,
  Compass,
  CheckCircle2,
  Lock,
  Key,
  Flame,
  BookOpen,
  Clock,
  Moon,
  Gift,
  ChevronRight,
  HelpCircle,
  Volume2,
  VolumeX,
  Scroll,
} from 'lucide-react';
import { VisitorUser, TreasureTarget } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface GothicTreasureHuntProps {
  user: VisitorUser;
  onReturnToPuzzle: () => void;
  onReturnToEntrance: () => void;
  onProceedToNextChapter: () => void;
}

interface ClueData {
  stepIndex: number;
  target: TreasureTarget;
  riddleSource: string;
  riddleText: string;
  answerName: string;
  hint: string;
  rewardName: string;
  rewardIcon: React.ReactNode;
}

const CLUES_DATA: ClueData[] = [
  {
    stepIndex: 0,
    target: 'clock',
    riddleSource: 'Ancient Parchment',
    riddleText: 'I have a face but never speak.\nI have hands but never touch.',
    answerName: 'Grandfather Clock',
    hint: 'Look for the tall wooden timepiece standing in the shadows of the library.',
    rewardName: 'Clock Mechanism Note',
    rewardIcon: <Clock className="w-4 h-4 text-cyan-400" />,
  },
  {
    stepIndex: 1,
    target: 'book',
    riddleSource: 'Hidden Inside The Clock',
    riddleText: 'I have many pages but I cannot remember.\nFind me where knowledge sleeps.',
    answerName: 'Ancient Grimoire',
    hint: 'Search the study table for the leather-bound book resting near the scrolls.',
    rewardName: 'Spellbook Inscription',
    rewardIcon: <BookOpen className="w-4 h-4 text-amber-400" />,
  },
  {
    stepIndex: 2,
    target: 'candle',
    riddleSource: 'Inscribed Inside The Book',
    riddleText: 'I give light but I am not the sun.',
    answerName: 'Gothic Candelabra',
    hint: 'Seek the dripping wax candle illuminating the ancient mahogany desk.',
    rewardName: 'Candle Flame Revelation',
    rewardIcon: <Flame className="w-4 h-4 text-orange-400" />,
  },
  {
    stepIndex: 3,
    target: 'key',
    riddleSource: 'Revealed Behind The Candle',
    riddleText: 'I open doors but have no feet.',
    answerName: 'Golden Ancient Key',
    hint: 'Look closely at the carved shelf right next to the candelabra.',
    rewardName: 'Gilded Sanctuary Key',
    rewardIcon: <Key className="w-4 h-4 text-yellow-400" />,
  },
  {
    stepIndex: 4,
    target: 'moon',
    riddleSource: 'Engraved Upon The Key',
    riddleText: 'Look where the moon watches over the castle.',
    answerName: 'The Crescent Moon & Stained Glass Window',
    hint: 'Gaze out through the grand gothic arched window into the starry midnight sky.',
    rewardName: 'Moonlight Alignment',
    rewardIcon: <Moon className="w-4 h-4 text-indigo-300" />,
  },
];

export const GothicTreasureHunt: React.FC<GothicTreasureHuntProps> = ({
  user,
  onReturnToPuzzle,
  onReturnToEntrance,
  onProceedToNextChapter,
}) => {
  // Current active clue step (0 to 4), or 5 when all are solved
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [discoveredTargets, setDiscoveredTargets] = useState<TreasureTarget[]>([]);
  const [justFoundTarget, setJustFoundTarget] = useState<TreasureTarget | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isChestSpawning, setIsChestSpawning] = useState<boolean>(false);
  const [isChestUnlocked, setIsChestUnlocked] = useState<boolean>(false);
  const [isChestOpen, setIsChestOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hasKeyInInventory, setHasKeyInInventory] = useState<boolean>(false);

  // Entrance fade-in
  const [hasFadedIn, setHasFadedIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasFadedIn(true);
      soundEngine.playMysteryChime();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const activeClue = currentStep < CLUES_DATA.length ? CLUES_DATA[currentStep] : null;

  // Handle clicking on room objects
  const handleObjectClick = (target: TreasureTarget) => {
    // If treasure is already unlocked, clicking chest opens it
    if (isChestSpawning || isChestOpen) return;

    // Check if this object is the active target for the current clue
    if (activeClue && activeClue.target === target) {
      // Correct object found!
      soundEngine.playClueFound();
      setJustFoundTarget(target);
      setShowHint(false);

      if (!discoveredTargets.includes(target)) {
        setDiscoveredTargets((prev) => [...prev, target]);
      }

      if (target === 'key') {
        setHasKeyInInventory(true);
      }

      setFeedbackMessage(`✨ You discovered the ${activeClue.answerName}!`);

      setTimeout(() => {
        setJustFoundTarget(null);
        setFeedbackMessage(null);

        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);

        // If completed all 5 clues
        if (nextStep >= CLUES_DATA.length) {
          triggerChestRevelation();
        }
      }, 1400);
    } else {
      // Clicked wrong object or already discovered object
      if (discoveredTargets.includes(target)) {
        soundEngine.playHoverTone();
        setFeedbackMessage(`You already examined this secret.`);
      } else {
        soundEngine.playIncorrectTap();
        setFeedbackMessage(`The shadows whisper: "This is not the answer to your current clue yet..."`);
      }

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 2000);
    }
  };

  // Final revelation of the mysterious friend chest
  const triggerChestRevelation = () => {
    setIsChestSpawning(true);
    soundEngine.playSuccessGateOpen();

    // Step 1: Chest spawns
    setTimeout(() => {
      setIsChestUnlocked(true);
      soundEngine.playChestUnlock();
    }, 1800);

    // Step 2: Chest opens
    setTimeout(() => {
      setIsChestOpen(true);
      soundEngine.playChestOpen();
    }, 3200);
  };

  const isCompleted = currentStep >= CLUES_DATA.length;

  return (
    <div
      id="page3-treasure-hunt-root"
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-[#03060f] text-slate-200 transition-opacity duration-1000 ${
        hasFadedIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. Deep Atmospheric Castle Library Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-75 scale-100"
        style={{
          backgroundImage: "url('/background.png')",
        }}
      />

      {/* 2. Gothic Atmospheric Vignette & Lighting Rays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02050e]/80 via-black/40 to-[#02040a]/90 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.2)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.15)_0%,transparent_60%)] pointer-events-none" />

      {/* 3. Floating Dust & Sparkle Motes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-300/60 blur-[1px] animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-amber-300/50 blur-[1px] animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-indigo-300/60 blur-[1px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* 4. Top Header & Navigation HUD */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playHoverTone();
              onReturnToPuzzle();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-slate-700/60 text-slate-300 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-all backdrop-blur-md cursor-pointer group shadow-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Page 2 Puzzle</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 border border-cyan-500/30 text-xs font-cinzel text-cyan-300 backdrop-blur-md">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">{user.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 font-cinzel text-xs tracking-wider backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chapter III &bull; The Hidden Treasure Hunt</span>
          </div>
        </div>

        {/* Right HUD: Secrets Found Counter & Inventory */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Inventory Pocket (Shows found Key) */}
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/70 border border-slate-700/60 backdrop-blur-md">
            <span className="text-[10px] sm:text-xs font-cinzel text-slate-400 tracking-wider mr-1">
              Inventory:
            </span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                hasKeyInInventory
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-bounce'
                  : 'bg-black/50 border-slate-800 text-slate-600'
              }`}
              title={hasKeyInInventory ? 'Sanctuary Key Found!' : 'Empty slot'}
            >
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Secrets Progress Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 border border-cyan-500/40 text-xs font-cinzel backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-slate-300">Secrets: </span>
            <span className="text-cyan-300 font-bold ml-0.5">
              {Math.min(5, discoveredTargets.length)} <span className="text-slate-500 font-normal">/ 5</span>
            </span>
          </div>
        </div>
      </header>

      {/* 5. Center Interactive Castle Library Room Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full max-w-6xl mx-auto">
        {/* Dynamic Objective Banner */}
        <div className="text-center mb-2 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-cinzel text-[11px] sm:text-xs tracking-[0.25em] uppercase shadow-[0_0_20px_rgba(56,189,248,0.2)] mb-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>The Hidden Treasure Hunt</span>
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.15em] sm:tracking-[0.22em] uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            "The next memory is hidden somewhere in this room."
          </h1>
          <p className="font-cormorant text-xs sm:text-base text-slate-300 italic tracking-wider">
            Five secrets are hidden here. Search the room to follow the trail of clues.
          </p>
        </div>

        {/* Feedback Message Toast */}
        {feedbackMessage && (
          <div className="fixed top-20 z-50 px-5 py-2 rounded-xl bg-black/90 border border-cyan-400/80 text-cyan-200 text-xs sm:text-sm font-cinzel tracking-wider shadow-[0_0_30px_rgba(56,189,248,0.5)] animate-fadeIn">
            {feedbackMessage}
          </div>
        )}

        {/* 6. THE INTERACTIVE GOTHIC ROOM SCENE CANVAS */}
        <div className="relative w-full max-w-4xl aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#060b18] via-[#090e1c] to-[#04060c]">
          {/* Room Interior Scenery Layer */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(56,189,248,0.18)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(245,158,11,0.12)_0%,transparent_45%)]" />

          {/* Wooden Arch Ceiling & Pillars Frame */}
          <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/80 to-transparent pointer-events-none" />

          {/* ========================================================================= */}
          {/* OBJECT 1: 🌙 GOTHIC ARCHED WINDOW & CRESCENT MOON (Top-Right / Sky) */}
          {/* ========================================================================= */}
          <div
            id="target-moon-window"
            onClick={() => handleObjectClick('moon')}
            className={`absolute top-4 sm:top-6 right-6 sm:right-12 w-28 sm:w-40 h-36 sm:h-52 rounded-t-full border-4 transition-all duration-500 cursor-pointer group flex flex-col items-center justify-center overflow-hidden shadow-2xl ${
              justFoundTarget === 'moon'
                ? 'border-cyan-300 ring-4 ring-cyan-400/80 scale-105 shadow-[0_0_50px_rgba(56,189,248,0.9)]'
                : discoveredTargets.includes('moon')
                ? 'border-indigo-400/70 bg-indigo-950/40 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                : activeClue?.target === 'moon'
                ? 'border-cyan-500/60 hover:border-cyan-300 bg-slate-950/80 hover:scale-102 hover:shadow-[0_0_35px_rgba(56,189,248,0.5)]'
                : 'border-slate-700/60 hover:border-slate-500 bg-slate-950/70'
            }`}
          >
            {/* Night Sky with Stars */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-900" />
            <div className="absolute top-3 left-4 w-1 h-1 bg-white rounded-full animate-ping" />
            <div className="absolute top-8 right-6 w-1 h-1 bg-cyan-200 rounded-full animate-pulse" />
            <div className="absolute bottom-10 left-8 w-1 h-1 bg-amber-200 rounded-full animate-pulse" />

            {/* Radiant Glowing Crescent Moon */}
            <div className="relative z-10 w-12 sm:w-16 h-12 sm:h-16 rounded-full shadow-[0_0_30px_rgba(224,242,254,0.8)] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Moon className="w-10 sm:w-14 h-10 sm:h-14 text-cyan-100 fill-cyan-100/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" />
            </div>

            {/* Gothic Window Tracery Lines */}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-slate-700/50" />
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-700/50" />

            {/* Discovery Badge */}
            {discoveredTargets.includes('moon') && (
              <div className="absolute bottom-2 z-20 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400 text-[9px] font-cinzel text-cyan-200 font-bold">
                ✓ Moon Aligned
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* OBJECT 2: 🕰️ VINTAGE GRANDFATHER CLOCK (Left side) */}
          {/* ========================================================================= */}
          <div
            id="target-clock"
            onClick={() => handleObjectClick('clock')}
            className={`absolute top-10 sm:top-12 left-6 sm:left-12 w-20 sm:w-28 h-56 sm:h-80 rounded-t-xl border-2 transition-all duration-500 cursor-pointer group flex flex-col items-center justify-between p-2 shadow-2xl ${
              justFoundTarget === 'clock'
                ? 'border-cyan-300 ring-4 ring-cyan-400/80 scale-105 shadow-[0_0_50px_rgba(56,189,248,0.9)]'
                : discoveredTargets.includes('clock')
                ? 'border-cyan-500/50 bg-[#160e0a]/90 shadow-[0_0_25px_rgba(56,189,248,0.3)]'
                : activeClue?.target === 'clock'
                ? 'border-amber-500/60 hover:border-cyan-300 bg-[#120a06]/90 hover:scale-102 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                : 'border-slate-800 bg-[#0d0704]/90 hover:border-slate-600'
            }`}
          >
            {/* Clock Head & Dial */}
            <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-full bg-amber-100/10 border-2 border-amber-400/60 flex items-center justify-center shadow-inner relative group-hover:rotate-6 transition-transform">
              <Clock className="w-9 sm:w-12 h-9 sm:h-12 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </div>

            {/* Pendulum Body */}
            <div className="w-8 sm:w-12 flex-1 my-2 rounded-lg bg-black/60 border border-amber-900/40 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Swinging pendulum */}
              <div
                className="w-1 bg-amber-500/70 h-16 origin-top animate-pulse"
                style={{ transform: 'rotate(15deg)' }}
              />
              <div className="w-4 h-4 rounded-full bg-amber-400/90 shadow-[0_0_10px_rgba(245,158,11,0.8)] -mt-2" />
            </div>

            {/* Clock Base with Carving */}
            <div className="w-full py-1 text-center bg-black/70 rounded border border-amber-900/30">
              <span className="text-[9px] font-cinzel text-amber-300/80 tracking-wider">
                {discoveredTargets.includes('clock') ? '✓ Unlocked' : 'Tempus'}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* OBJECT 3: 📖 ANCIENT GRIMOIRE / BOOK (Center-Left on Study Table) */}
          {/* ========================================================================= */}
          <div
            id="target-book"
            onClick={() => handleObjectClick('book')}
            className={`absolute bottom-16 sm:bottom-20 left-32 sm:left-48 w-24 sm:w-36 h-18 sm:h-24 rounded-xl border-2 transition-all duration-500 cursor-pointer group flex flex-col items-center justify-center p-2 shadow-2xl z-10 ${
              justFoundTarget === 'book'
                ? 'border-cyan-300 ring-4 ring-cyan-400/80 scale-105 shadow-[0_0_50px_rgba(56,189,248,0.9)]'
                : discoveredTargets.includes('book')
                ? 'border-purple-500/50 bg-[#160c22]/90 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                : activeClue?.target === 'book'
                ? 'border-purple-400/70 hover:border-cyan-300 bg-[#12081c]/90 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]'
                : 'border-slate-800 bg-[#0d0514]/90 hover:border-slate-600'
            }`}
          >
            <div className="relative flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-8 sm:w-12 h-8 sm:h-12 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
              {discoveredTargets.includes('book') && (
                <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-cyan-300 animate-spin" />
              )}
            </div>
            <span className="mt-1 text-[9px] sm:text-[10px] font-cinzel text-purple-200 tracking-wider">
              {discoveredTargets.includes('book') ? '✓ Grimoire Read' : 'Ancient Tome'}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* OBJECT 4: 🕯️ GOTHIC CANDELABRA & CANDLE (Center-Right on Study Table) */}
          {/* ========================================================================= */}
          <div
            id="target-candle"
            onClick={() => handleObjectClick('candle')}
            className={`absolute bottom-20 sm:bottom-24 right-32 sm:right-56 w-18 sm:w-26 h-28 sm:h-36 rounded-xl border-2 transition-all duration-500 cursor-pointer group flex flex-col items-center justify-end p-2 shadow-2xl z-10 ${
              justFoundTarget === 'candle'
                ? 'border-cyan-300 ring-4 ring-cyan-400/80 scale-105 shadow-[0_0_50px_rgba(56,189,248,0.9)]'
                : discoveredTargets.includes('candle')
                ? 'border-orange-500/50 bg-[#1e0f06]/90 shadow-[0_0_25px_rgba(249,115,22,0.4)]'
                : activeClue?.target === 'candle'
                ? 'border-orange-400/70 hover:border-cyan-300 bg-[#160a03]/90 hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]'
                : 'border-slate-800 bg-[#0e0501]/90 hover:border-slate-600'
            }`}
          >
            {/* Glowing Flame */}
            <div className="relative mb-1 flex items-center justify-center group-hover:scale-125 transition-transform">
              <div className="w-4 h-4 rounded-full bg-orange-400 blur-sm animate-ping" />
              <Flame className="absolute w-7 sm:w-9 h-7 sm:h-9 text-amber-300 fill-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse" />
            </div>

            {/* Candle Wax Stick & Brass Stand */}
            <div className="w-3 sm:w-4 h-10 sm:h-14 bg-gradient-to-b from-amber-100 to-amber-200/60 rounded-t-sm border border-amber-400/40" />
            <div className="w-10 sm:w-14 h-3 bg-amber-600 rounded-full border border-amber-300 shadow-md" />

            <span className="mt-1 text-[9px] font-cinzel text-amber-200 tracking-wider">
              {discoveredTargets.includes('candle') ? '✓ Candle Lit' : 'Candelabra'}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* OBJECT 5: 🔑 GILDED ANCIENT KEY (On the study shelf next to candle) */}
          {/* ========================================================================= */}
          <div
            id="target-key"
            onClick={() => handleObjectClick('key')}
            className={`absolute bottom-6 sm:bottom-8 right-16 sm:right-28 w-20 sm:w-28 h-14 sm:h-18 rounded-xl border-2 transition-all duration-500 cursor-pointer group flex flex-col items-center justify-center p-1.5 shadow-2xl z-10 ${
              justFoundTarget === 'key'
                ? 'border-yellow-300 ring-4 ring-yellow-400/80 scale-105 shadow-[0_0_50px_rgba(234,179,8,0.9)]'
                : discoveredTargets.includes('key')
                ? 'border-yellow-500/50 bg-[#1c1605]/90 shadow-[0_0_25px_rgba(234,179,8,0.3)]'
                : activeClue?.target === 'key'
                ? 'border-yellow-400/70 hover:border-cyan-300 bg-[#161003]/90 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]'
                : 'border-slate-800 bg-[#0d0901]/90 hover:border-slate-600'
            }`}
          >
            <div className="relative flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Key className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-300 drop-shadow-[0_0_12px_rgba(234,179,8,0.7)]" />
              {discoveredTargets.includes('key') && (
                <div className="absolute inset-0 bg-yellow-400/30 blur-sm rounded-full" />
              )}
            </div>
            <span className="mt-1 text-[8px] sm:text-[9px] font-cinzel text-yellow-200 tracking-wider">
              {discoveredTargets.includes('key') ? '✓ Key Acquired' : 'Old Key'}
            </span>
          </div>

          {/* Study Desk Foreground Mahogany Surface */}
          <div className="absolute bottom-0 inset-x-0 h-12 sm:h-16 bg-gradient-to-t from-[#140804] to-[#241108]/90 border-t-2 border-amber-900/60 shadow-2xl" />

          {/* ========================================================================= */}
          {/* 💎 7. THE REVEALED TREASURE CHEST (Center Stage Materialization) */}
          {/* ========================================================================= */}
          {isChestSpawning && (
            <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
              <div className="relative w-full max-w-lg bg-gradient-to-b from-[#160d26] via-[#0d0718] to-black border-2 border-cyan-400 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(56,189,248,0.6)] flex flex-col items-center">
                {/* Floating Gilded Chest Animation */}
                <div className="relative mb-4">
                  <div className="w-24 sm:w-28 h-20 sm:h-24 rounded-2xl bg-gradient-to-b from-amber-700 via-amber-900 to-[#1e0e06] border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)] relative overflow-hidden group">
                    {/* Key unlocking animation */}
                    {!isChestOpen ? (
                      <div className="flex flex-col items-center gap-1">
                        <Lock className="w-8 h-8 text-amber-300 animate-pulse" />
                        <span className="text-[10px] font-cinzel text-amber-200">
                          {isChestUnlocked ? 'Unlocking...' : 'Unsealed with Key'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Gift className="w-10 h-10 text-cyan-300 animate-bounce" />
                        <span className="text-[10px] font-cinzel text-cyan-200 font-bold">
                          OPENED
                        </span>
                      </div>
                    )}
                    {/* Radiant light rays escaping from chest */}
                    {isChestOpen && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.5)_0%,transparent_70%)] animate-ping" />
                    )}
                  </div>
                </div>

                <div className="inline-block px-3 py-1 mb-2 rounded-full bg-cyan-950/80 border border-cyan-400 text-xs font-cinzel font-bold text-cyan-300 tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                  TREASURE FOUND
                </div>

                <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-white tracking-[0.15em] uppercase mb-1 drop-shadow-[0_2px_15px_rgba(56,189,248,0.7)]">
                  "You found what was hidden..."
                </h2>

                {/* THE FRIEND'S TREASURE KEEPSAKE & PHOTOGRAPH */}
                {isChestOpen && (
                  <div className="w-full my-4 p-4 rounded-xl bg-black/60 border border-cyan-500/40 shadow-inner flex flex-col items-center animate-fadeIn">
                    <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-xl overflow-hidden border-2 border-cyan-300 shadow-[0_0_25px_rgba(56,189,248,0.5)] mb-3">
                      <img
                        src="/puzzle_photo.jpeg"
                        alt="Restored Friendship Memory"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-1 inset-x-0 text-center text-[10px] font-cinzel text-cyan-200 font-bold">
                        {user.name}
                      </div>
                    </div>

                    <p className="font-cormorant text-sm sm:text-base text-slate-200 italic text-center max-w-sm leading-relaxed mb-1">
                      "True gold fades in the dust of centuries, but the bonds of friendship and cherished moments shine eternally. Happy Birthday and warmest wishes, <span className="text-cyan-300 font-semibold">{user.name}</span>."
                    </p>
                  </div>
                )}

                {/* Transition to Page 4 CTA */}
                {isChestOpen && (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playHoverTone();
                        onProceedToNextChapter();
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:shadow-[0_0_45px_rgba(56,189,248,0.9)] border border-cyan-300 transition-all hover:scale-105"
                    >
                      <span>Proceed to Chapter IV</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playHoverTone();
                        onReturnToPuzzle();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-cinzel text-xs tracking-wider transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                      <span>Replay Puzzle</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 8. ACTIVE CLUE PARCHMENT SCROLL PANEL (Bottom HUD) */}
        {!isChestSpawning && (
          <div className="w-full max-w-3xl mt-3 p-3 sm:p-4 rounded-2xl bg-black/80 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-fadeIn">
            {activeClue ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Clue Number & Icon */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                    <Scroll className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-cinzel text-cyan-400 font-bold uppercase tracking-widest">
                      Clue #{activeClue.stepIndex + 1} of 5 &bull; {activeClue.riddleSource}
                    </div>
                    <div className="text-xs font-cinzel text-slate-400">
                      Target: Solve the riddle below
                    </div>
                  </div>
                </div>

                {/* Riddle Text */}
                <div className="flex-1 text-center sm:text-left px-2">
                  <p className="font-cormorant text-base sm:text-lg text-white italic font-medium whitespace-pre-line leading-snug">
                    "{activeClue.riddleText}"
                  </p>
                </div>

                {/* Hint Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playHint();
                      setShowHint((prev) => !prev);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-1 font-cinzel text-xs text-cyan-300 tracking-widest">
                ✨ All 5 secrets unlocked! Preparing revelation...
              </div>
            )}

            {/* Hint Popup Drawer */}
            {showHint && activeClue && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs font-cormorant italic text-cyan-200/90 animate-fadeIn">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Whisper:</strong> {activeClue.hint}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 9. Minimalist Gothic Footer */}
      <footer className="relative z-20 pb-2 text-center text-slate-500 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none">
        Chapter III &bull; The Hidden Treasure Hunt &bull; Gothic Secrets Revealed
      </footer>
    </div>
  );
};
