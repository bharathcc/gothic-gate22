import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GothicBackground } from './components/GothicBackground';
import { SecretDoorIntro } from './components/SecretDoorIntro';
import { RiddleCard } from './components/RiddleCard';
import { GateTransition } from './components/GateTransition';
import { PhotoPuzzleChallenge } from './components/PhotoPuzzleChallenge';
import { TreasureHuntPage } from './components/TreasureHuntPage';
import { Page4Placeholder } from './components/Page4Placeholder';
import { Page5CoupleQuiz } from './components/Page5CoupleQuiz';
import { FinalBirthdayPage } from './components/FinalBirthdayPage';
import { AudioControl } from './components/AudioControl';
import { VisitorLoginModal } from './components/VisitorLoginModal';
import { AdminPortal } from './components/AdminPortal';
import { RIDDLE_CONFIG } from './config/riddleConfig';
import { soundEngine } from './utils/soundEngine';
import { validateAnswer } from './utils/answerValidator';
import { QuestionAnswerRecord, VisitorUser } from './types';
import { sendClientLoginAlert, sendClientGateAttemptAlert } from './utils/clientAlertGateway';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'entrance' | 'photoPuzzle' | 'thirdPage' | 'castleChambers' | 'page5Quiz' | 'finalBirthdayPage'>('entrance');
  const [isLightningActive, setIsLightningActive] = useState<boolean>(false);
  const [isSuccessTransition, setIsSuccessTransition] = useState<boolean>(false);
  const [isSinging, setIsSinging] = useState<boolean>(false);
  const [isIntroCompleted, setIsIntroCompleted] = useState<boolean>(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState<number>(0);
  const [mouseParallax, setMouseParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visitor User Profile & Identity Modal
  const [visitorUser, setVisitorUser] = useState<VisitorUser>({
    id: '',
    name: 'Mortal Visitor',
    loginTime: new Date().toISOString(),
  });
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [gateAnswerRecord, setGateAnswerRecord] = useState<QuestionAnswerRecord | undefined>(undefined);

  // Keyboard shortcut listener to toggle Admin & Dossier Portal (Ctrl+Shift+D or Cmd+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsAdminModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Attempt tracking + direct email alerting + database store
  const sessionIdRef = useRef<string>('');
  const attemptCountRef = useRef<number>(0);

  // Initialize session & visitor state
  useEffect(() => {
    try {
      const sessionKey = 'gothic-entrance-session-id';
      let id = localStorage.getItem(sessionKey);
      if (!id) {
        id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(sessionKey, id);
      }
      sessionIdRef.current = id;
      const countKey = `gothic-entrance-attempts-${id}`;
      attemptCountRef.current = Number(localStorage.getItem(countKey) || '0');

      // Load saved visitor info if any
      const savedUserStr = localStorage.getItem('gothic-visitor-user');
      let initialUser: VisitorUser;
      if (savedUserStr) {
        try {
          initialUser = JSON.parse(savedUserStr);
        } catch {
          initialUser = { id, name: 'Mortal Visitor', loginTime: new Date().toISOString() };
        }
      } else {
        initialUser = { id, name: 'Mortal Visitor', loginTime: new Date().toISOString() };
      }
      setVisitorUser(initialUser);

      // Register session with backend database directly
      void fetch('/api/visitor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: id,
          userName: initialUser.name,
          moniker: initialUser.moniker,
          email: initialUser.email,
        }),
      });
    } catch {
      sessionIdRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }, []);

  const handleUpdateVisitor = (info: { name: string; moniker?: string; email?: string }) => {
    const updated: VisitorUser = {
      ...visitorUser,
      name: info.name,
      moniker: info.moniker,
      email: info.email,
    };
    setVisitorUser(updated);
    try {
      localStorage.setItem('gothic-visitor-user', JSON.stringify(updated));
    } catch {}

    // Synchronize with server directly
    void fetch('/api/visitor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        userName: updated.name,
        moniker: updated.moniker,
        email: updated.email,
      }),
    }).catch(() => null);

    // Direct cloud push + email fail-safe dispatch
    void sendClientLoginAlert(updated.name, updated.moniker, updated.email);
  };

  // Periodic random atmospheric lightning flashes
  const triggerLightning = useCallback(() => {
    setIsLightningActive(true);
    soundEngine.playThunder();

    setTimeout(() => {
      setIsLightningActive(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (currentPage !== 'entrance') return;

    const scheduleNextLightning = () => {
      const delay = Math.random() * 10000 + 10000;
      return setTimeout(() => {
        triggerLightning();
        timerId = scheduleNextLightning();
      }, delay);
    };

    let timerId = scheduleNextLightning();

    return () => {
      clearTimeout(timerId);
    };
  }, [currentPage, triggerLightning]);

  // Mouse / Touch Parallax listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseParallax({ x: normX, y: normY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Attempt Alert + Direct Server Email & Storage Dispatch with Multi-Attempt Retry & Timeout Protection
  const sendAttemptAlert = useCallback(async (details: {
    answer: string;
    method: 'voice' | 'typed';
    audioBase64?: string;
    audioMimeType?: string;
  }, result: ReturnType<typeof validateAnswer>) => {
    attemptCountRef.current += 1;
    const attemptNumber = attemptCountRef.current;
    try {
      localStorage.setItem(`gothic-entrance-attempts-${sessionIdRef.current}`, String(attemptNumber));
    } catch {}

    const payload = {
      sessionId: sessionIdRef.current,
      userName: visitorUser.name || 'Mortal Visitor',
      moniker: visitorUser.moniker || '',
      email: visitorUser.email || '',
      attemptNumber,
      method: details.method,
      submittedAnswer: details.answer,
      normalizedAnswer: result.normalized,
      isCorrect: result.isValid,
      timestamp: new Date().toISOString(),
      audioBase64: details.audioBase64,
      audioMimeType: details.audioMimeType,
    };

    // Retry loop with exponential backoff and timeout
    const MAX_RETRIES = 3;
    let success = false;

    for (let tryIndex = 0; tryIndex < MAX_RETRIES && !success; tryIndex++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      try {
        // If previous try failed and we had audio, fallback to lightweight text payload
        const currentBody = (tryIndex > 0 && payload.audioBase64)
          ? { ...payload, audioBase64: undefined }
          : payload;

        const response = await fetch('/api/attempt-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          console.log(`[Attempt Alert] Successfully dispatched attempt #${attemptNumber} (Email sent: ${resData.emailSent ? 'YES' : 'NO'})`);
          success = true;
          break;
        } else {
          console.warn(`[Attempt Alert] Server responded with status ${response.status} on attempt ${tryIndex + 1}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isAbort = err?.name === 'AbortError';
        console.warn(`[Attempt Alert] Attempt ${tryIndex + 1} error (${isAbort ? 'Timeout' : err?.message || 'Network error'})`);
      }

      // Backoff delay before retrying
      if (!success && tryIndex < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (tryIndex + 1)));
      }
    }

    if (!success) {
      console.warn(`[Attempt Alert] Server dispatch failed; triggering direct client cloud alert fallback for attempt #${attemptNumber}.`);
      void sendClientGateAttemptAlert({
        userName: visitorUser.name || 'Mortal Visitor',
        moniker: visitorUser.moniker,
        attemptNumber,
        method: details.method,
        submittedAnswer: details.answer,
        isCorrect: result.isValid,
      });
    }
  }, [visitorUser]);

  // Answer validation logic using robust fuzzy matching + email alert + direct storage
  const handleValidateAnswer = (answer: string, details?: { method?: 'voice' | 'typed'; audioBase64?: string; audioMimeType?: string }) => {
    const result = validateAnswer(answer);
    const method = details?.method === 'voice' ? 'voice' : 'typed';

    // 1. Send instant attempt alert with visitor name & audio to email
    void sendAttemptAlert({
      answer,
      method,
      audioBase64: details?.audioBase64,
      audioMimeType: details?.audioMimeType,
    }, result);

    // 2. Direct server storage for login answer
    const q1Record: QuestionAnswerRecord = {
      questionId: 'q1_gate_riddle',
      questionNumber: 1,
      questionTitle: 'The Gatekeeper Riddle',
      questionPrompt: RIDDLE_CONFIG.question,
      answer: answer.trim(),
      normalizedAnswer: result.normalized,
      method,
      timestamp: new Date().toISOString(),
      audioBase64: details?.audioBase64,
      audioMimeType: details?.audioMimeType,
    };

    setGateAnswerRecord(q1Record);

    void fetch('/api/visitor/record-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        questionId: q1Record.questionId,
        questionNumber: 1,
        questionTitle: q1Record.questionTitle,
        questionPrompt: q1Record.questionPrompt,
        answer: q1Record.answer,
        normalizedAnswer: q1Record.normalizedAnswer,
        method: q1Record.method,
        isCorrect: result.isValid,
        audioBase64: details?.audioBase64,
        audioMimeType: details?.audioMimeType,
      }),
    });

    if (result.isValid) {
      setRejectionMessage(null);
      triggerLightning();
      soundEngine.playSuccessGateOpen();
      setIsSuccessTransition(true);
    } else {
      soundEngine.playRejection();
      setRejectionMessage(RIDDLE_CONFIG.rejectionMessage);
      setShakeTrigger((prev) => prev + 1);

      setTimeout(() => {
        setShakeTrigger(0);
      }, 600);
    }
  };

  const handleTransitionComplete = () => {
    setIsSuccessTransition(false);
    setCurrentPage('photoPuzzle');
  };

  const handleReturnToEntrance = () => {
    // Notify server of reset/return
    if (sessionIdRef.current) {
      void fetch('/api/visitor/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          stageName: 'Return to Entrance Gate',
        }),
      });
    }
    setCurrentPage('entrance');
    setIsSuccessTransition(false);
    setRejectionMessage(null);
  };

  const handleFullReset = async () => {
    try {
      // Clear server records
      await fetch('/api/visitor/reset-all', { method: 'POST' }).catch(() => null);
    } catch {}

    try {
      // Clear client storage
      localStorage.removeItem('gothic-visitor-user');
      localStorage.removeItem('gothic-entrance-session-id');
      localStorage.removeItem('gothic_puzzle_unlocked');
      localStorage.removeItem('gothic_puzzle_state');
      localStorage.removeItem('gothic_treasure_state');
    } catch {}

    // Generate fresh session ID
    const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionIdRef.current = newId;
    attemptCountRef.current = 0;
    try {
      localStorage.setItem('gothic-entrance-session-id', newId);
    } catch {}

    const freshUser: VisitorUser = { id: newId, name: 'Mortal Visitor', loginTime: new Date().toISOString() };
    setVisitorUser(freshUser);
    setCurrentPage('entrance');
    setIsIntroCompleted(false);
    setIsSuccessTransition(false);
    setRejectionMessage(null);
    setIsSinging(false);

    // Register clean session
    void fetch('/api/visitor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: newId,
        userName: freshUser.name,
      }),
    });
  };

  const handleRestartQuiz = () => {
    // Notify server of quiz replay/restart
    if (sessionIdRef.current) {
      void fetch('/api/visitor/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          stageName: 'Replay Couple Quiz (Chapter V)',
        }),
      });
    }
    setCurrentPage('page5Quiz');
  };

  const handlePuzzleComplete = () => {
    setCurrentPage('thirdPage');
  };

  const handleReturnToPuzzle = () => {
    setCurrentPage('photoPuzzle');
  };

  const handleProceedToChapter4 = () => {
    setCurrentPage('castleChambers');
  };

  const handleReturnToTreasureHunt = () => {
    setCurrentPage('thirdPage');
  };

  // PAGE 2: Broken Memory 3x3 Photo Puzzle Challenge
  if (currentPage === 'photoPuzzle') {
    return (
      <PhotoPuzzleChallenge
        user={visitorUser}
        sessionId={sessionIdRef.current}
        onPuzzleComplete={handlePuzzleComplete}
        onReturnToEntrance={handleReturnToEntrance}
      />
    );
  }

  // PAGE 3: The Hidden Treasure Hunt (Destination after puzzle is restored)
  if (currentPage === 'thirdPage') {
    return (
      <TreasureHuntPage
        user={visitorUser}
        sessionId={sessionIdRef.current}
        onReturnToPuzzle={handleReturnToPuzzle}
        onProceedToPage4={handleProceedToChapter4}
      />
    );
  }

  // PAGE 4: Dr. Dracula MBBS Quiz Chamber (Chapter IV)
  if (currentPage === 'castleChambers') {
    return (
      <Page4Placeholder
        user={visitorUser}
        sessionId={sessionIdRef.current}
        onReturnToTreasureHunt={handleReturnToTreasureHunt}
        onReturnToEntrance={handleReturnToEntrance}
        onProceedToNext={() => setCurrentPage('page5Quiz')}
      />
    );
  }

  // PAGE 5: Couple Edition "How Well Do You Actually Know Us?" Quiz (Chapter V)
  if (currentPage === 'page5Quiz') {
    return (
      <Page5CoupleQuiz
        user={visitorUser}
        sessionId={sessionIdRef.current}
        onReturnToChapter4={() => setCurrentPage('castleChambers')}
        onReturnToEntrance={handleReturnToEntrance}
        onProceedToNext={() => setCurrentPage('finalBirthdayPage')}
      />
    );
  }

  // FINAL PAGE: Completely soft, cute, and simple Birthday Final Page
  if (currentPage === 'finalBirthdayPage') {
    return (
      <FinalBirthdayPage
        user={visitorUser}
        sessionId={sessionIdRef.current}
        onReturnToEntrance={handleReturnToEntrance}
        onRestartQuiz={handleRestartQuiz}
        onReturnToPreviousStage={() => setCurrentPage('page5Quiz')}
      />
    );
  }

  return (
    <div
      id="gothic-app-root"
      className="relative min-h-screen w-full overflow-hidden bg-[#02050a] flex flex-col justify-between"
    >
      {/* 1. Dynamic Cinematic Gothic Background Layer */}
      <GothicBackground
        isLightningActive={isLightningActive}
        isSuccessTransition={isSuccessTransition}
        mouseParallax={mouseParallax}
        isSinging={isSinging}
      />

      {/* 2. Top Bar & Atmospheric Controls & Visitor Identity */}
      <AudioControl
        onManualLightning={triggerLightning}
        visitorName={visitorUser.name}
        onOpenVisitorModal={() => setIsVisitorModalOpen(true)}
        onResetAll={handleFullReset}
      />

      {/* 3. Center Entrance Challenge & Riddle Panel / Secret Door Intro */}
      <main className="relative z-30 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 w-full max-w-5xl mx-auto">
        {!isIntroCompleted ? (
          <SecretDoorIntro
            onComplete={() => setIsIntroCompleted(true)}
            onManualLightning={triggerLightning}
          />
        ) : (
          <RiddleCard
            config={RIDDLE_CONFIG}
            onValidateAnswer={handleValidateAnswer}
            isProcessing={isSuccessTransition}
            isSuccess={isSuccessTransition}
            rejectionMessage={rejectionMessage}
            shakeTrigger={shakeTrigger}
            onSingingChange={setIsSinging}
          />
        )}
      </main>

      {/* 4. Cinematic Success Gate Transition Sequence */}
      {isSuccessTransition && (
        <GateTransition
          successMessage={RIDDLE_CONFIG.successMessage}
          onTransitionComplete={handleTransitionComplete}
        />
      )}

      {/* 5. Visitor Identity Modal (for setting/viewing their name) */}
      <VisitorLoginModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        currentName={visitorUser.name}
        currentMoniker={visitorUser.moniker}
        currentEmail={visitorUser.email}
        onSave={handleUpdateVisitor}
      />

      {/* 6. Admin & Visitor Dossier Control Panel */}
      <AdminPortal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onResetApp={handleFullReset}
      />

      {/* 7. Discreet Admin Trigger (Click to open dossier/email control) */}
      <div className="fixed bottom-3 right-3 z-40">
        <button
          onClick={() => setIsAdminModalOpen(true)}
          title="Dossier & Email Delivery Diagnostics (Ctrl+Shift+D)"
          className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 text-[10px] text-slate-400 hover:text-rose-300 backdrop-blur transition-all flex items-center gap-1.5 shadow-lg opacity-60 hover:opacity-100"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Dossier & Email Panel</span>
        </button>
      </div>

      {/* 8. Minimalist Atmospheric Footer */}
      <footer className="relative z-20 pb-3 text-center text-slate-500/70 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none select-none">
        {!isIntroCompleted
          ? 'A mysterious chamber awaits \u2022 Open the door to proceed'
          : 'Stand before the ancient gates \u2022 Sing the melody to unseal'}
      </footer>
    </div>
  );
}
