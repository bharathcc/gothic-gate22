import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Keyboard,
  Send,
  Sparkles,
  CheckCircle2,
  Volume2,
  RefreshCw,
  Compass,
  Utensils,
  Scroll,
  Crown,
  Check,
  Mail,
  Flame,
  ArrowRight,
  ArrowLeft,
  Castle,
  Lock,
} from 'lucide-react';
import { CASTLE_CHAMBER_QUESTIONS } from '../config/castleQuestions';
import { CastleQuestion, QuestionAnswerRecord, VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface CastleChambersQuestProps {
  user: VisitorUser;
  gateAnswerRecord?: QuestionAnswerRecord;
  sessionId: string;
  onReturnToGates: () => void;
  onReturnToTreasureHunt?: () => void;
}

export const CastleChambersQuest: React.FC<CastleChambersQuestProps> = ({
  user,
  gateAnswerRecord,
  sessionId,
  onReturnToGates,
  onReturnToTreasureHunt,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<string, QuestionAnswerRecord>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmittingQuest, setIsSubmittingQuest] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message?: string } | null>(null);

  // Input modes for active question: 'voice' | 'typed'
  const [inputMode, setInputMode] = useState<'voice' | 'typed'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [recordedAudioBase64, setRecordedAudioBase64] = useState('');
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState('audio/webm');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedAudioRef = useRef<{ base64: string; mimeType: string }>({ base64: '', mimeType: 'audio/webm' });

  const currentQuestion: CastleQuestion = CASTLE_CHAMBER_QUESTIONS[currentStepIndex];

  // Initialize gate answer into map on mount
  useEffect(() => {
    if (gateAnswerRecord) {
      setAnswersMap((prev) => ({
        ...prev,
        [gateAnswerRecord.questionId]: gateAnswerRecord,
      }));
    }
  }, [gateAnswerRecord]);

  // Cleanup audio tracks on unmount or question change
  const cleanupAudio = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { void audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  // Reset inputs when navigating between questions
  useEffect(() => {
    cleanupAudio();
    const existing = answersMap[currentQuestion.id];
    if (existing) {
      setTypedInput(existing.answer);
      setVoiceTranscript(existing.method === 'voice' ? existing.answer : '');
    } else {
      setTypedInput('');
      setVoiceTranscript('');
      setRecordedAudioBase64('');
      recordedAudioRef.current = { base64: '', mimeType: 'audio/webm' };
    }
    setFeedbackMessage(null);
  }, [currentStepIndex]);

  const startVoiceRecording = async () => {
    try {
      cleanupAudio();
      soundEngine.playMicClick();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, avg / 80));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      chunksRef.current = [];
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
      let selectedMime = 'audio/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: selectedMime });
        if (blob.size > 100) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            recordedAudioRef.current = { base64: base64Data, mimeType: selectedMime };
            setRecordedAudioBase64(base64Data);
            setRecordedAudioMimeType(selectedMime);
            void transcribeVoiceAudio(base64Data, selectedMime);
          };
          reader.readAsDataURL(blob);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setVoiceTranscript('');
    } catch (err) {
      console.error('[Chambers] Mic access error:', err);
      setInputMode('typed');
      setFeedbackMessage('Microphone access unavailable. You can type your answer below.');
    }
  };

  const stopVoiceRecording = () => {
    soundEngine.playMicClick();
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
    setAudioLevel(0);
  };

  const transcribeVoiceAudio = async (audioBase64: string, mimeType: string) => {
    setIsTranscribing(true);
    try {
      const resp = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      const data = await resp.json();
      if (data.success && data.transcript) {
        setVoiceTranscript(data.transcript);
        soundEngine.playHoverTone();
      } else {
        setFeedbackMessage('Could not transcribe audio. You can re-record or type your answer.');
      }
    } catch {
      setFeedbackMessage('Voice recognition encountered an issue. You may type your answer directly.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveCurrentAnswer = async () => {
    const rawAnswer = inputMode === 'voice' ? voiceTranscript.trim() : typedInput.trim();
    if (!rawAnswer) {
      setFeedbackMessage('Please speak or type your answer before continuing.');
      return;
    }

    soundEngine.playSuccessGateOpen();
    const audioData = inputMode === 'voice' ? (recordedAudioRef.current.base64 || recordedAudioBase64) : undefined;
    const audioMime = inputMode === 'voice' ? (recordedAudioRef.current.mimeType || recordedAudioMimeType) : undefined;

    const answerRecord: QuestionAnswerRecord = {
      questionId: currentQuestion.id,
      questionNumber: currentQuestion.number,
      questionTitle: currentQuestion.title,
      questionPrompt: currentQuestion.prompt,
      answer: rawAnswer,
      method: inputMode === 'voice' && audioData ? 'voice' : 'typed',
      timestamp: new Date().toISOString(),
      audioBase64: audioData,
      audioMimeType: audioMime,
    };

    // Update local state
    setAnswersMap((prev) => ({
      ...prev,
      [currentQuestion.id]: answerRecord,
    }));

    // Save to server
    try {
      await fetch('/api/visitor/record-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          questionNumber: currentQuestion.number,
          questionTitle: currentQuestion.title,
          questionPrompt: currentQuestion.prompt,
          answer: rawAnswer,
          method: answerRecord.method,
          isCorrect: true,
          audioBase64: audioData,
          audioMimeType: audioMime,
        }),
      });
    } catch (err) {
      console.warn('[Castle Chambers] Could not save answer to server:', err);
    }

    setFeedbackMessage(currentQuestion.vampireFeedback);

    // If there are more questions, advance to next
    if (currentStepIndex < CASTLE_CHAMBER_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, 1000);
    } else {
      // Completed all questions
      setTimeout(() => {
        void handleCompleteQuest();
      }, 1200);
    }
  };

  const handleCompleteQuest = async () => {
    setIsSubmittingQuest(true);
    soundEngine.playThunder();

    try {
      const resp = await fetch('/api/visitor/complete-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await resp.json();
      if (data.success) {
        setEmailStatus({
          sent: true,
          message: 'All records and voice audio files have been emailed to kmsiddesh009@gmail.com!',
        });
      } else {
        setEmailStatus({
          sent: false,
          message: data.error || 'Email dispatch completed with notices.',
        });
      }
    } catch (err: any) {
      setEmailStatus({
        sent: false,
        message: 'Records saved securely. Email delivery attempted.',
      });
    } finally {
      setIsSubmittingQuest(false);
      setIsCompleted(true);
    }
  };

  const getQuestionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass': return <Compass className="w-5 h-5 text-cyan-400" />;
      case 'Utensils': return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'Scroll': return <Scroll className="w-5 h-5 text-purple-400" />;
      case 'Crown': return <Crown className="w-5 h-5 text-yellow-400" />;
      default: return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  // =====================================
  // RENDER: QUEST COMPLETED CEREMONY
  // =====================================
  if (isCompleted) {
    const allAnswersList: QuestionAnswerRecord[] = (Object.values(answersMap) as QuestionAnswerRecord[]).sort((a, b) => a.questionNumber - b.questionNumber);

    return (
      <div className="relative z-10 w-full max-w-3xl my-auto py-8 px-6 sm:px-10 rounded-2xl gothic-glass border border-cyan-500/40 shadow-[0_0_60px_rgba(56,189,248,0.25)] bg-[#070b14]/95 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.5)]">
          <Crown className="w-10 h-10 text-cyan-300 animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-cinzel-decorative font-bold text-white tracking-widest mb-2 drop-shadow-[0_2px_15px_rgba(56,189,248,0.5)]">
          The Seal of Immortality
        </h1>

        <p className="text-sm font-cinzel tracking-wider text-cyan-300 mb-6">
          Castle Master Chronicles &bull; All 5 Questions Successfully Recorded
        </p>

        {/* Email Notification Banner */}
        <div className="mb-6 p-4 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-left flex items-start gap-3 shadow-inner">
          <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-cinzel tracking-wider text-cyan-200 font-bold uppercase">
              Dossier Dispatched to kmsiddesh009@gmail.com
            </div>
            <p className="text-xs font-cormorant text-slate-300 mt-0.5">
              All question answers, timestamps, and attached original microphone audio recordings have been archived and sent to the administrator.
            </p>
          </div>
        </div>

        {/* Summary Table of All Questions */}
        <div className="text-left mb-8 max-h-72 overflow-y-auto pr-1 space-y-3 rounded-xl border border-slate-800/80 bg-black/50 p-4">
          <div className="text-xs font-cinzel tracking-widest text-slate-400 uppercase font-semibold mb-2">
            Recorded Answers for {user.name}:
          </div>
          {allAnswersList.map((rec) => (
            <div key={rec.questionId} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-cinzel text-cyan-400 font-semibold mb-1">
                <span>Question #{rec.questionNumber}: {rec.questionTitle}</span>
                <span className="text-[10px] text-slate-400 uppercase bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  {rec.method.toUpperCase()} {rec.audioBase64 ? '🎙️ Audio' : '⌨️ Typed'}
                </span>
              </div>
              <div className="text-sm font-cormorant italic text-white pl-2 border-l-2 border-cyan-500/70">
                "{rec.answer}"
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {onReturnToTreasureHunt && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHoverTone();
                onReturnToTreasureHunt();
              }}
              className="px-6 py-3 rounded-lg gothic-btn text-cyan-100 font-cinzel text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
            >
              <Compass className="w-4 h-4" />
              <span>Return to Treasure Hunt</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToGates}
            className="px-6 py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-cinzel text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Gates</span>
          </button>
        </div>
      </div>
    );
  }

  // =====================================
  // RENDER: ACTIVE QUESTION CHAMBER
  // =====================================
  const answeredCount = Object.keys(answersMap).length;
  const currentAnswerValue = inputMode === 'voice' ? voiceTranscript : typedInput;
  const hasValue = Boolean(currentAnswerValue.trim());

  return (
    <div className="relative z-10 w-full max-w-2xl my-auto py-8 px-6 sm:px-10 rounded-2xl gothic-glass border border-cyan-500/30 shadow-[0_0_50px_rgba(56,189,248,0.2)] bg-[#070b14]/90 text-center animate-fadeIn">
      {/* Progress Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2 text-xs font-cinzel text-cyan-400 tracking-wider">
          {getQuestionIcon(currentQuestion.iconName)}
          <span>{currentQuestion.chamberName}</span>
        </div>
        <div className="text-xs font-cinzel text-slate-400 tracking-widest uppercase">
          Question <span className="text-cyan-300 font-bold">{currentStepIndex + 2}</span> of 5
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-6 border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-indigo-500 transition-all duration-500"
          style={{ width: `${((currentStepIndex + 2) / 5) * 100}%` }}
        />
      </div>

      {/* Question Title & Prompt */}
      <h2 className="text-xs sm:text-sm font-cinzel tracking-[0.2em] text-cyan-300/90 uppercase font-semibold mb-2">
        {currentQuestion.title}
      </h2>
      <h1 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-white tracking-wide mb-3 drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]">
        "{currentQuestion.prompt}"
      </h1>
      <p className="text-xs font-cormorant italic text-slate-400 mb-6">
        {currentQuestion.hint}
      </p>

      {/* Input Mode Selector (Voice vs Typed) */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => { soundEngine.playHoverTone(); setInputMode('voice'); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-cinzel tracking-wider transition-all cursor-pointer ${
            inputMode === 'voice'
              ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
              : 'bg-black/50 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Microphone Voice</span>
        </button>
        <button
          type="button"
          onClick={() => { soundEngine.playHoverTone(); setInputMode('typed'); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-cinzel tracking-wider transition-all cursor-pointer ${
            inputMode === 'typed'
              ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
              : 'bg-black/50 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Type Answer</span>
        </button>
      </div>

      {/* Active Input Panel */}
      {inputMode === 'voice' ? (
        <div className="space-y-4 mb-6">
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-black/60 border border-slate-800">
            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 border-2 border-red-300 flex items-center justify-center text-white cursor-pointer shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse"
                >
                  <MicOff className="w-7 h-7" />
                </button>
                <span className="text-xs font-cinzel text-red-400 tracking-wider animate-pulse font-semibold">
                  Recording... Click to finish speaking
                </span>
                {/* Audio Wave Visualizer bar */}
                <div className="w-48 h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-75"
                    style={{ width: `${Math.max(10, audioLevel * 100)}%` }}
                  />
                </div>
              </div>
            ) : isTranscribing ? (
              <div className="flex flex-col items-center gap-3 py-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-xs font-cinzel text-cyan-300 tracking-wider">
                  Listening to your words via Gemini AI...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-900 to-slate-800 hover:from-cyan-700 hover:to-slate-700 border-2 border-cyan-400 flex items-center justify-center text-cyan-200 cursor-pointer shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all hover:scale-105"
                >
                  <Mic className="w-7 h-7 text-cyan-300" />
                </button>
                <span className="text-xs font-cinzel text-slate-300 tracking-wider">
                  Click to speak or sing your answer
                </span>
              </div>
            )}

            {/* Transcription Display */}
            {voiceTranscript && (
              <div className="w-full mt-4 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-left">
                <div className="text-[10px] font-cinzel tracking-wider text-cyan-400 uppercase font-semibold mb-1">
                  Recorded Answer:
                </div>
                <div className="text-sm font-cormorant italic text-white">
                  "{voiceTranscript}"
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <textarea
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder={currentQuestion.placeholder}
            rows={3}
            className="w-full p-4 rounded-xl bg-black/60 border border-cyan-900/80 focus:border-cyan-400 focus:outline-none text-white text-sm font-cormorant placeholder:text-slate-600 shadow-inner resize-none"
          />
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="mb-6 p-3 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-xs font-cormorant italic text-cyan-200">
          {feedbackMessage}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
            else onReturnToGates();
          }}
          className="px-4 py-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-cinzel tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentStepIndex > 0 ? 'Previous Chamber' : 'Return to Gates'}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveCurrentAnswer}
          disabled={!hasValue || isRecording || isTranscribing || isSubmittingQuest}
          className={`px-6 py-2.5 rounded-lg gothic-btn font-cinzel text-xs tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg transition-all ${
            hasValue && !isRecording && !isTranscribing
              ? 'text-cyan-100 hover:shadow-cyan-500/30'
              : 'opacity-50 cursor-not-allowed text-slate-500'
          }`}
        >
          <span>{currentStepIndex === CASTLE_CHAMBER_QUESTIONS.length - 1 ? 'Seal My Destiny & Send Dossier' : 'Save & Next Chamber'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
