import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Laugh,
  Crown,
  Flame,
  Stars,
  MessageCircle,
} from 'lucide-react';
import { VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface Page5Props {
  user: VisitorUser;
  sessionId?: string;
  onReturnToChapter4?: () => void;
  onReturnToEntrance?: () => void;
  onProceedToNext?: () => void;
}

interface QuestionConfig {
  id: number;
  question: string;
  emoji: string;
  feedbackDracula: { line1: string; line2?: string };
  feedbackSK: { line1: string; line2?: string };
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 1,
    question: 'Who sent the first message? 😄',
    emoji: '💬',
    feedbackDracula: {
      line1: 'Bold move, DRACULA! 💬',
      line2: 'Starting history right from the beginning.',
    },
    feedbackSK: {
      line1: 'Ah yes, SK made the first move! ✨',
      line2: 'A historic message.',
    },
  },
  {
    id: 2,
    question: 'Who usually starts our conversations? 😄',
    emoji: '📱',
    feedbackDracula: {
      line1: 'Notification master! 🔔',
      line2: 'Can’t resist starting the chat!',
    },
    feedbackSK: {
      line1: 'Always keeping the vibe alive! ✨',
      line2: 'SK never lets the conversation pause.',
    },
  },
  {
    id: 3,
    question: 'Who gets angry first? 😂',
    emoji: '🔥',
    feedbackDracula: {
      line1: 'HAHA okay, at least you admit it 😂',
      line2: 'Honesty is the best policy!',
    },
    feedbackSK: {
      line1: 'Nice try 😂',
      line2: "Okay... I'll let you believe that.",
    },
  },
  {
    id: 4,
    question: 'Who says "I\'m fine" when they\'re clearly NOT fine? 😂',
    emoji: '🙈',
    feedbackDracula: {
      line1: 'EXACTLY 😂',
      line2: 'The classic mystery.',
    },
    feedbackSK: {
      line1: 'Excuse me?! 😂',
      line2: "Fine... we'll go with your answer.",
    },
  },
  {
    id: 5,
    question: 'Who would get caught first if we were criminals? 😂',
    emoji: '🕵️‍♀️',
    feedbackDracula: {
      line1: 'Zero stealth mode whatsoever! 🚓😂',
      line2: 'Handcuffed in 2 minutes flat.',
    },
    feedbackSK: {
      line1: 'Too busy overthinking the heist! 🚔😂',
      line2: 'Busted immediately!',
    },
  },
  {
    id: 6,
    question: 'Who is more stubborn? 😄',
    emoji: '🧱',
    feedbackDracula: {
      line1: 'At least you know yourself 😂',
      line2: 'Unshakeable determination.',
    },
    feedbackSK: {
      line1: "HAHAHA you're blaming SK now?! 😭",
      line2: 'Okay okay, I’ll accept it.',
    },
  },
  {
    id: 7,
    question: 'Who usually wins our arguments? 😄',
    emoji: '🏆',
    feedbackDracula: {
      line1: 'Undefeated champion! 👑',
      line2: 'Wins every single debate.',
    },
    feedbackSK: {
      line1: 'Supreme logic deployed! ✨',
      line2: 'A rare victory claimed!',
    },
  },
  {
    id: 8,
    question: 'Who is the best lip-sync video maker? 😄',
    emoji: '🎬',
    feedbackDracula: {
      line1: 'HAHAHA okay superstar 😂',
      line2: 'Fine, DRACULA gets the award today. 🏆',
    },
    feedbackSK: {
      line1: 'FINALLY! Someone with good judgment. 😎😂',
      line2: 'Undisputed lip-sync superstar.',
    },
  },
  {
    id: 9,
    question: 'Who is the better dancer? 😄',
    emoji: '💃',
    feedbackDracula: {
      line1: 'Okay okay... let DRACULA have her moment 😂💃',
      line2: 'Taking the spotlight!',
    },
    feedbackSK: {
      line1: 'Correct. No debate. 😎',
      line2: 'Recognizing genuine rhythm!',
    },
  },
  {
    id: 10,
    question: 'Who is more crazy? 🤪',
    emoji: '🤡',
    feedbackDracula: {
      line1: 'FINALLY, YOU ADMIT IT! 😂🧛‍♀️',
      line2: 'Certified 100% wild energy!',
    },
    feedbackSK: {
      line1: 'Nice try 😂',
      line2: "We both know it's DRACULA.",
    },
  },
];

export const Page5CoupleQuiz: React.FC<Page5Props> = ({
  user,
  sessionId,
  onReturnToChapter4,
  onReturnToEntrance,
  onProceedToNext,
}) => {
  // Phase: 'intro_dialogue' | 'intro_card' | 'question' | 'completed'
  const [phase, setPhase] = useState<'intro_dialogue' | 'intro_card' | 'question' | 'completed'>('intro_dialogue');
  const [dialogueStep, setDialogueStep] = useState<number>(0);

  // Active question index (0 to 9)
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Selected Choice & Feedback State
  const [selectedChoice, setSelectedChoice] = useState<'DRACULA' | 'SK' | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ line1: string; line2: string } | null>(null);
  const [isNextReady, setIsNextReady] = useState<boolean>(false);

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timeouts
  const clearTimeouts = () => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  // Opening Dialogue Sequence
  useEffect(() => {
    setDialogueStep(0); // "Okayyy... 😂"
    soundEngine.playDraculaPoke(3);

    const t1 = setTimeout(() => {
      setDialogueStep(1); // "Please... one last quiz. 🥹"
      soundEngine.playDraculaPoke(5);
    }, 2000);

    const t2 = setTimeout(() => {
      setDialogueStep(2); // "JUST ONE LAST ONE, I PROMISE! 😭😂"
      soundEngine.playDraculaPoke(7);
    }, 4200);

    const t3 = setTimeout(() => {
      setDialogueStep(3); // "How well do you actually know us? 👀"
      soundEngine.playKeyGlow();
    }, 6500);

    const t4 = setTimeout(() => {
      setPhase('intro_card');
      soundEngine.playSuccessGateOpen();
    }, 8800);

    timeoutRefs.current.push(t1, t2, t3, t4);
  }, []);

  // Skip Intro if clicked
  const handleSkipIntro = () => {
    clearTimeouts();
    setPhase('intro_card');
    soundEngine.playSuccessGateOpen();
  };

  // Start Quiz Handler
  const handleStartQuiz = () => {
    soundEngine.playHoverTone();
    soundEngine.playHeartbeat();
    setCurrentIndex(0);
    setSelectedChoice(null);
    setIsLocked(false);
    setFeedback(null);
    setIsNextReady(false);
    setPhase('question');
  };

  // Option Click Handler (Both choices always accepted, playful reaction shown)
  const handleChoice = (choice: 'DRACULA' | 'SK') => {
    if (isLocked) return;

    setIsLocked(true);
    setSelectedChoice(choice);
    setIsNextReady(false);
    soundEngine.playQuizCorrect();

    const q = QUESTIONS[currentIndex];
    const fb = choice === 'DRACULA' ? q.feedbackDracula : q.feedbackSK;
    setFeedback({
      line1: fb.line1,
      line2: fb.line2 || '',
    });

    if (sessionId && q) {
      void fetch('/api/visitor/record-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: `page5_couple_q${currentIndex + 1}_id${q.id}`,
          questionNumber: 5,
          questionTitle: `[Couple Trivia #${currentIndex + 1}] ${q.question}`,
          questionPrompt: q.question,
          answer: `Chosen: ${choice} (${choice === 'DRACULA' ? 'Dracula 🧛‍♀️' : 'SK ✨'}) — Feedback: "${fb.line1}"`,
          method: 'typed',
          isCorrect: true,
        }),
      });
    }

    // Wait 1.2s then reveal the NEXT button
    const nextTimer = setTimeout(() => {
      setIsNextReady(true);
    }, 1200);
    timeoutRefs.current.push(nextTimer);
  };

  // Next Question Handler
  const handleNext = () => {
    soundEngine.playHoverTone();
    if (currentIndex + 1 < QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setIsLocked(false);
      setFeedback(null);
      setIsNextReady(false);
    } else {
      // Completed all 10
      if (sessionId) {
        void fetch('/api/visitor/record-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: 'page5_couple_summary',
            questionNumber: 5,
            questionTitle: 'Couple Edition Quiz Completed',
            questionPrompt: 'Completed all 10 playful couple trivia questions.',
            answer: 'All 10 questions answered! 100% matched vibe.',
            method: 'typed',
            isCorrect: true,
          }),
        });
      }
      soundEngine.playSuccessGateOpen();
      setPhase('completed');
    }
  };

  const currentQ = QUESTIONS[currentIndex];

  return (
    <div
      id="page5-couple-quiz-root"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-[#05030a] text-slate-100"
    >
      {/* ========================================================================= */}
      {/* 1. ATMOSPHERIC FULL-SCREEN BACKGROUND */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-[0.88] contrast-105"
        style={{ backgroundImage: "url('/page5_bg.png'), url('/page4_bg.png')" }}
      />

      {/* Warm Romantic & Gothic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05020c]/90 via-[#0a0414]/60 to-[#05020c]/80 pointer-events-none" />

      {/* Floating Sparkle Motes & Hearts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[15%] left-[12%] w-2.5 h-2.5 rounded-full bg-pink-400 blur-[1px] animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-[20%] right-[10%] w-3 h-3 rounded-full bg-rose-400 blur-[1px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[45%] right-[25%] w-2 h-2 rounded-full bg-amber-300 animate-ping" style={{ animationDuration: '5s' }} />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP NAVIGATION BAR */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-3 pb-2 flex items-center justify-between pointer-events-auto backdrop-blur-[2px]">
        {/* Left: Back to Chapter 4 & User Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onReturnToChapter4 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHoverTone();
                onReturnToChapter4();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-slate-700/70 text-slate-300 hover:text-pink-300 font-cinzel text-xs tracking-wider transition-all backdrop-blur-md cursor-pointer group shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
              <span className="hidden sm:inline">Chapter IV</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-pink-500/30 text-xs font-cinzel text-pink-300 backdrop-blur-md shadow-lg">
            <User className="w-3.5 h-3.5 text-pink-400" />
            <span className="max-w-[110px] sm:max-w-[150px] truncate">{user.name}</span>
          </div>
        </div>

        {/* Center: Title Badge */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-black/85 border border-pink-500/50 text-pink-200 font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(244,114,182,0.3)] backdrop-blur-md">
          <span>CHAPTER V</span>
          <span className="hidden md:inline text-slate-400 font-normal">&bull; THE FINAL TRIAL</span>
        </div>

        {/* Right: Progress Indicator */}
        {phase === 'question' ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border border-amber-500/40 text-xs font-cinzel text-amber-300 backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">PROGRESS:</span>
            <span className="font-bold font-mono text-white text-sm">{currentIndex + 1}/10</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-slate-700/60 text-xs font-cinzel text-slate-300 backdrop-blur-md">
            <Stars className="w-3.5 h-3.5 text-pink-400" />
            <span>Chapter V</span>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 w-full max-w-3xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6">
        {/* ----------------------------------------------------------------- */}
        {/* A. OPENING DIALOGUE SEQUENCE */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'intro_dialogue' && (
          <div
            onClick={handleSkipIntro}
            className="w-full max-w-lg mx-auto text-center p-8 sm:p-10 rounded-3xl gothic-glass border-2 border-pink-500/50 shadow-[0_0_80px_rgba(244,114,182,0.35)] bg-[#0c0416]/92 backdrop-blur-xl animate-fadeIn flex flex-col items-center cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-pink-950/80 border border-pink-500/60 flex items-center justify-center text-3xl mb-5 shadow-[0_0_30px_rgba(244,114,182,0.5)] animate-bounce">
              {dialogueStep === 0 && '😂'}
              {dialogueStep === 1 && '🥹'}
              {dialogueStep === 2 && '😭'}
              {dialogueStep === 3 && '👀'}
            </div>

            {dialogueStep === 0 && (
              <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-pink-200 tracking-wider uppercase animate-fadeIn">
                "Okayyy... 😂"
              </h2>
            )}

            {dialogueStep === 1 && (
              <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-amber-200 tracking-wider uppercase animate-fadeIn">
                "Please... one last quiz. 🥹"
              </h2>
            )}

            {dialogueStep === 2 && (
              <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-rose-300 tracking-wider uppercase animate-fadeIn">
                "JUST ONE LAST ONE, I PROMISE! 😭😂"
              </h2>
            )}

            {dialogueStep === 3 && (
              <div className="animate-fadeIn">
                <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-pink-300 tracking-wider uppercase mb-2">
                  "How well do you actually know us? 👀"
                </h2>
                <p className="font-cormorant text-base text-slate-300 italic">
                  Let's put your memories to the ultimate test...
                </p>
              </div>
            )}

            <span className="mt-8 text-[11px] font-cinzel tracking-widest text-slate-500 group-hover:text-pink-300 uppercase transition-colors">
              Click anywhere to skip
            </span>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* B. INTRO CARD (START QUIZ) */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'intro_card' && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-pink-500/60 shadow-[0_0_90px_rgba(244,114,182,0.4)] bg-[#0d0418]/92 backdrop-blur-xl animate-fadeIn flex flex-col items-center">
            {/* Crown & Sparkle Badge */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-950 via-purple-950 to-rose-900 border-2 border-pink-400 flex items-center justify-center shadow-[0_0_40px_rgba(244,114,182,0.6)] animate-pulse">
                <Crown className="w-10 h-10 text-pink-300" />
              </div>
              <div className="absolute -top-1 -right-1 text-2xl">✨</div>
            </div>

            <div className="inline-block px-4 py-1 rounded-full bg-pink-950/80 border border-pink-500/50 text-xs font-cinzel font-bold text-pink-300 tracking-[0.25em] uppercase mb-2 shadow-md">
              THE LAST QUIZ &bull; PROMISE!
            </div>

            <h1 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.15em] uppercase mb-2 drop-shadow-[0_2px_15px_rgba(244,114,182,0.8)]">
              HOW WELL DO YOU ACTUALLY KNOW US?
            </h1>

            <p className="font-cormorant text-base sm:text-lg text-slate-300 italic mb-6">
              "10 playful questions. Answer honestly, Doctor. 👀"
            </p>

            {/* Start Button */}
            <button
              type="button"
              id="btn-start-couple-quiz"
              onClick={handleStartQuiz}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_45px_rgba(244,114,182,0.7)] border border-pink-300 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span>[ START QUIZ ]</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* C. ACTIVE QUESTION CARD (1 TO 10) */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'question' && currentQ && (
          <div className="w-full max-w-xl mx-auto rounded-3xl gothic-glass border-2 border-pink-500/50 shadow-[0_0_80px_rgba(244,114,182,0.35)] bg-[#0d0417]/94 backdrop-blur-xl p-6 sm:p-8 animate-fadeIn flex flex-col justify-between">
            <div>
              {/* Question Header Progress */}
              <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/70 border border-pink-500/40 text-[11px] font-cinzel font-semibold tracking-wider text-pink-300 uppercase">
                  <span>{currentQ.emoji}</span>
                  <span>Trial #{currentQ.id}</span>
                </div>

                <div className="font-cinzel text-xs sm:text-sm font-bold tracking-widest text-amber-300">
                  QUESTION {currentIndex + 1} <span className="text-slate-500">/ 10</span>
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-white tracking-wide leading-relaxed text-center mb-8 min-h-[56px] flex items-center justify-center">
                {currentQ.question}
              </h2>

              {/* TWO CHOICE BUTTONS: 🧛‍♀️ DRACULA | SK */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* BUTTON DRACULA */}
                <button
                  type="button"
                  id={`btn-choice-dracula-${currentQ.id}`}
                  disabled={isLocked}
                  onClick={() => handleChoice('DRACULA')}
                  className={`py-6 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-cinzel text-xl sm:text-2xl font-bold tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer shadow-lg ${
                    isLocked
                      ? selectedChoice === 'DRACULA'
                        ? 'bg-gradient-to-b from-pink-900/90 to-rose-950/90 border-pink-400 text-white shadow-[0_0_35px_rgba(244,114,182,0.65)] scale-102 ring-2 ring-pink-400/50'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-40'
                      : 'bg-gradient-to-b from-pink-950/75 to-slate-900/90 border-pink-500/50 text-pink-200 hover:border-pink-400 hover:text-white hover:shadow-[0_0_25px_rgba(244,114,182,0.45)] hover:scale-103 active:scale-97'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl">🧛‍♀️</span>
                  <span>DRACULA</span>
                </button>

                {/* BUTTON SK */}
                <button
                  type="button"
                  id={`btn-choice-sk-${currentQ.id}`}
                  disabled={isLocked}
                  onClick={() => handleChoice('SK')}
                  className={`py-6 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-cinzel text-xl sm:text-2xl font-bold tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer shadow-lg ${
                    isLocked
                      ? selectedChoice === 'SK'
                        ? 'bg-gradient-to-b from-purple-900/90 to-indigo-950/90 border-purple-400 text-white shadow-[0_0_35px_rgba(192,132,252,0.65)] scale-102 ring-2 ring-purple-400/50'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-40'
                      : 'bg-gradient-to-b from-purple-950/75 to-slate-900/90 border-purple-500/50 text-purple-200 hover:border-purple-400 hover:text-white hover:shadow-[0_0_25px_rgba(192,132,252,0.45)] hover:scale-103 active:scale-97'
                  }`}
                >
                  <div className="h-9 sm:h-10 flex items-center justify-center">
                    <User className="w-8 h-8 sm:w-9 sm:h-9 text-purple-300 stroke-[1.5]" />
                  </div>
                  <span>SK</span>
                </button>
              </div>
            </div>

            {/* Answer Feedback & Next Button */}
            {isLocked && feedback && (
              <div className="mt-2 pt-4 border-t border-slate-800/80 flex flex-col items-center gap-4 animate-fadeIn">
                {/* Speech Bubble / Tease */}
                <div className="w-full text-center p-3 rounded-2xl bg-black/60 border border-pink-500/30">
                  <p className="font-cinzel text-base sm:text-lg font-bold text-pink-300 tracking-wide">
                    {feedback.line1}
                  </p>
                  <p className="font-cormorant text-sm sm:text-base text-slate-300 italic mt-0.5">
                    {feedback.line2}
                  </p>
                </div>

                {/* Next Button (Reveals after 1.2s of chuckle/reading time) */}
                {isNextReady && (
                  <button
                    type="button"
                    id="btn-next-couple-question"
                    onClick={handleNext}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(244,114,182,0.5)] border border-pink-300 hover:scale-105 transition-all animate-fadeIn"
                  >
                    <span>{currentIndex < 9 ? 'NEXT QUESTION' : 'SEE FINAL VERDICT'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* D. COMPLETED SCREEN (AFTER QUESTION 10) */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'completed' && (
          <div className="w-full max-w-lg mx-auto text-center p-8 sm:p-10 rounded-3xl gothic-glass border-2 border-pink-500/70 shadow-[0_0_100px_rgba(244,114,182,0.5)] bg-[#0d0319]/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center">
            {/* Victory / Survived Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-950 via-purple-950 to-amber-900 border-2 border-pink-400 flex items-center justify-center text-4xl mb-5 shadow-[0_0_45px_rgba(244,114,182,0.7)] animate-bounce">
              👑
            </div>

            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-pink-300 tracking-wider uppercase mb-2">
              "Okayyy... that's enough 😂"
            </h2>

            <p className="font-cinzel text-lg sm:text-xl font-semibold text-amber-200 tracking-wide mb-6">
              "You survived the LAST quiz."
            </p>

            <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-center mb-8 max-w-md">
              <p className="font-cormorant text-base sm:text-lg text-slate-300 italic">
                All trials conquered, all secrets unsealed. The grand birthday revelation awaits you,{' '}
                <span className="text-pink-300 font-semibold">{user.name}</span>.
              </p>
            </div>

            {/* CONTINUE Button */}
            <button
              type="button"
              id="btn-continue-after-couple-quiz"
              onClick={() => {
                soundEngine.playSuccessGateOpen();
                if (onProceedToNext) {
                  onProceedToNext();
                } else if (onReturnToEntrance) {
                  onReturnToEntrance();
                }
              }}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-yellow-500 hover:from-pink-500 hover:to-yellow-400 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center gap-2.5 cursor-pointer shadow-[0_0_45px_rgba(244,114,182,0.8)] border border-pink-300 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-5 h-5 text-yellow-200" />
              <span>[ CONTINUE ]</span>
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER */}
      {/* ========================================================================= */}
      <footer className="relative z-20 pb-3 text-center text-slate-500 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none">
        Chapter V &bull; Couple Edition &bull; The Final Quiz
      </footer>
    </div>
  );
};
