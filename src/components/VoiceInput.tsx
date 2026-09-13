import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Mic, RefreshCw, Sparkles, Square, Volume2 } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface VoiceInputProps {
  onSubmitAnswer: (answer: string, details?: { method?: 'voice' | 'typed'; audioBase64?: string; audioMimeType?: string }) => void;
  isSuccess: boolean;
  isProcessing: boolean;
  onSingingChange?: (isSinging: boolean) => void;
}

type VoiceState = 'idle' | 'recording' | 'decoding' | 'ready_to_submit' | 'error';

const MAX_RECORDING_SECONDS = 8;
const MIN_RECORDING_MS = 900;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onSubmitAnswer,
  isSuccess,
  isProcessing,
  onSingingChange,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(18).fill(6));
  const [typedAnswer, setTypedAnswer] = useState('');
  const [recordedAudioBase64, setRecordedAudioBase64] = useState('');
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState('audio/webm');

  // Track failed voice capture attempts (0 initially; after 1 failure -> friendly prompt; after 2 failures -> reveal typed option)
  const [failedVoiceAttempts, setFailedVoiceAttempts] = useState<number>(0);
  const [friendlyNotice, setFriendlyNotice] = useState<string | null>(null);

  const recordedAudioRef = useRef<{ base64: string; mimeType: string }>({
    base64: '',
    mimeType: 'audio/webm',
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const stoppingRef = useRef(false);
  const recordingRef = useRef(false);

  useEffect(() => {
    recordingRef.current = voiceState === 'recording';
    onSingingChange?.(voiceState === 'recording');
  }, [voiceState, onSingingChange]);

  const maxRecordedVolumeRef = useRef<number>(0);

  const cleanupAudio = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    recorderRef.current = null;
    recordingRef.current = false;
  }, []);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  const speechRecognitionRef = useRef<any>(null);
  const speechRecognitionTranscriptRef = useRef<string>('');

  /**
   * Helper to handle voice capture / transcription failures:
   * Increments failed attempt count and updates the prompt.
   * Attempt 1 -> "Oops 😭 I couldn't catch that. Try once more!"
   * Attempt 2+ -> "Can't sing it? 😂 Type your answer instead:" + unlocks typed input
   */
  const handleVoiceCaptureFailure = useCallback((customMsg?: string) => {
    cleanupAudio();
    setFailedVoiceAttempts((prev) => {
      const next = prev + 1;
      if (next === 1) {
        setFriendlyNotice(customMsg || "Oops 😭 I couldn't catch that. Try once more!");
        setErrorMessage(null);
      } else {
        setFriendlyNotice("Can't sing it? 😂 Type your answer instead:");
        setErrorMessage(null);
      }
      return next;
    });
    setVoiceState('idle');
  }, [cleanupAudio]);

  const uploadAndTranscribe = useCallback(async (blob: Blob) => {
    setVoiceState('decoding');
    setErrorMessage(null);

    // If audio energy was practically silent during recording, reject immediately
    if (maxRecordedVolumeRef.current < 10) {
      handleVoiceCaptureFailure("I didn't hear anything! Please sing into the microphone 🎤");
      return;
    }

    if (!blob || blob.size < 500) {
      handleVoiceCaptureFailure();
      return;
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return reject(new Error('Could not read audio'));
          resolve(reader.result);
        };
        reader.onerror = () => reject(reader.error || new Error('Could not read audio'));
        reader.readAsDataURL(blob);
      });

      recordedAudioRef.current = {
        base64: base64Data,
        mimeType: blob.type || 'audio/webm',
      };
      setRecordedAudioBase64(base64Data);
      setRecordedAudioMimeType(blob.type || 'audio/webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: blob.type || 'audio/webm',
        }),
      });

      const data = await response.json().catch(() => null);

      if (data?.isSilent || !data?.success) {
        handleVoiceCaptureFailure(data?.error || "I couldn't hear any singing. Try again!");
        return;
      }

      let text = String(data?.transcript || '').trim();

      // Clean out any artifacts
      text = text.replace(/\[SILENCE\]/gi, '').trim();

      // Fallback: check browser speech recognition if server had no text
      if (!text && speechRecognitionTranscriptRef.current && maxRecordedVolumeRef.current >= 15) {
        text = speechRecognitionTranscriptRef.current.trim();
      }

      if (!text || text.length < 2) {
        handleVoiceCaptureFailure("I couldn't hear any words. Try singing louder!");
        return;
      }

      // Voice capture succeeded!
      setTranscript(text);
      setVoiceState('ready_to_submit');
    } catch (error) {
      console.warn('[VoiceInput] Server transcription notice:', error);
      if (speechRecognitionTranscriptRef.current && maxRecordedVolumeRef.current >= 15) {
        setTranscript(speechRecognitionTranscriptRef.current);
        setVoiceState('ready_to_submit');
      } else {
        handleVoiceCaptureFailure();
      }
    }
  }, [handleVoiceCaptureFailure]);

  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const elapsedMs = Date.now() - recordingStartedAtRef.current;
    if (elapsedMs < MIN_RECORDING_MS) {
      handleVoiceCaptureFailure("Recording too short. Sing the melody!");
      return;
    }

    stoppingRef.current = true;
    recordingRef.current = false;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finish = () => {
      const mime = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      cleanupAudio();
      uploadAndTranscribe(blob);
    };

    recorder.addEventListener('stop', finish, { once: true });
    try {
      recorder.stop();
    } catch (error) {
      console.error('[VoiceInput] recorder.stop failed:', error);
      cleanupAudio();
      handleVoiceCaptureFailure();
    }
  }, [cleanupAudio, handleVoiceCaptureFailure, uploadAndTranscribe]);

  const updateVisualizer = useCallback(() => {
    if (!recordingRef.current) return;
    const analyser = analyserRef.current;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const bars = 18;
      const step = Math.max(1, Math.floor(data.length / bars));
      
      let maxVal = 0;
      for (let j = 0; j < data.length; j++) {
        if (data[j] > maxVal) maxVal = data[j];
      }
      if (maxVal > maxRecordedVolumeRef.current) {
        maxRecordedVolumeRef.current = maxVal;
      }

      setAudioLevel(Array.from({ length: bars }, (_, i) => {
        const value = data[Math.min(i * step, data.length - 1)] || 0;
        return Math.max(5, Math.min(34, 5 + Math.pow(value / 255, 0.65) * 30));
      }));
    }
    animationRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const startRecording = async () => {
    if (isProcessing || isSuccess || voiceState === 'recording') return;
    soundEngine.playHoverTone();
    setErrorMessage(null);
    setTranscript('');
    setRecordingSeconds(0);
    chunksRef.current = [];
    stoppingRef.current = false;
    maxRecordedVolumeRef.current = 0;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      handleVoiceCaptureFailure();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      }

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanupAudio();
        handleVoiceCaptureFailure();
      };

      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      recordingRef.current = true;
      speechRecognitionTranscriptRef.current = '';

      // Initialize browser Web Speech Recognition in parallel if available
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript + ' ';
            }
            if (combined.trim()) {
              speechRecognitionTranscriptRef.current = combined.trim();
            }
          };
          rec.onerror = () => {};
          rec.start();
          speechRecognitionRef.current = rec;
        }
      } catch {}

      setVoiceState('recording');

      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(updateVisualizer);

      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        setRecordingSeconds(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) stopRecording();
      }, 1000);
    } catch (error: any) {
      console.error('[VoiceInput] microphone error:', error);
      handleVoiceCaptureFailure();
    }
  };

  const handleSubmit = () => {
    if (!transcript.trim() || isProcessing || isSuccess) return;
    soundEngine.playHoverTone();
    const audioData = recordedAudioRef.current.base64 || recordedAudioBase64;
    const mime = recordedAudioRef.current.mimeType || recordedAudioMimeType;
    onSubmitAnswer(transcript.trim(), { method: 'voice', audioBase64: audioData, audioMimeType: mime });
  };

  const handleTypedSubmit = () => {
    const answer = typedAnswer.trim();
    if (!answer || isProcessing || isSuccess) return;
    soundEngine.playHoverTone();
    onSubmitAnswer(answer, { method: 'typed' });
  };

  const handleReset = () => {
    soundEngine.playHoverTone();
    cleanupAudio();
    chunksRef.current = [];
    recordedAudioRef.current = { base64: '', mimeType: 'audio/webm' };
    setVoiceState('idle');
    setTranscript('');
    setRecordedAudioBase64('');
    setRecordedAudioMimeType('audio/webm');
    setErrorMessage(null);
    setRecordingSeconds(0);
    setAudioLevel(new Array(18).fill(6));
  };

  return (
    <div id="gothic-voice-interaction-root" className="w-full flex flex-col items-center justify-center mt-4">
      {voiceState === 'idle' && (
        <div className="flex flex-col items-center animate-fadeIn w-full">
          {/* Main Microphone Button */}
          <button
            id="sing-answer-mic-button"
            type="button"
            onClick={startRecording}
            disabled={isProcessing || isSuccess}
            aria-label="Sing your answer"
            className="group relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer bg-gradient-to-b from-[#14263b] via-[#0b1624] to-[#050b12] border border-cyan-500/40 text-slate-200 hover:text-cyan-200 hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(56,189,248,0.55)] shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
          >
            <div className="absolute inset-0 -m-2 rounded-full bg-cyan-500/10 group-hover:bg-cyan-400/20 blur-md transition-all pointer-events-none" />
            <Mic className="relative w-9 h-9 sm:w-10 sm:h-10 text-slate-300 group-hover:text-cyan-200 transition-transform group-hover:scale-110" />
          </button>
          
          <div className="mt-3 text-center">
            <span className="text-sm font-cinzel font-semibold tracking-widest text-slate-200">Sing your answer</span>
            <p className="text-xs font-cormorant italic text-slate-400 mt-0.5">Click the microphone to record your melody (up to 8s)</p>
          </div>

          {/* Friendly notice after 1st failed voice capture */}
          {failedVoiceAttempts === 1 && friendlyNotice && (
            <div
              id="voice-attempt-friendly-notice"
              className="mt-3.5 px-4 py-2 rounded-xl bg-amber-950/70 border border-amber-600/50 text-amber-200 text-center animate-fadeIn shadow-md max-w-xs"
            >
              <p className="text-xs sm:text-sm font-cormorant font-semibold tracking-wide">
                {friendlyNotice}
              </p>
            </div>
          )}

          {/* After 2 failed voice attempts: Reveal typed-answer option */}
          {failedVoiceAttempts >= 2 && (
            <div
              id="unlocked-typed-answer-section"
              className="w-full max-w-sm mt-5 pt-4 border-t border-cyan-900/60 animate-fadeIn"
            >
              <div className="text-center mb-3">
                <p className="text-xs sm:text-sm font-cormorant font-bold text-cyan-200 tracking-wide drop-shadow">
                  Can't sing it? 😂 Type your answer instead:
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  id="typed-answer-input"
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTypedSubmit();
                  }}
                  disabled={isProcessing || isSuccess}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Type your answer..."
                  aria-label="Type your answer"
                  className="min-w-0 flex-1 rounded-xl bg-black/70 border border-slate-700/80 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 outline-none px-4 py-2.5 text-sm font-cormorant text-cyan-100 placeholder:text-slate-600 transition-all"
                />
                <button
                  id="typed-answer-submit-button"
                  type="button"
                  onClick={handleTypedSubmit}
                  disabled={!typedAnswer.trim() || isProcessing || isSuccess}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-cyan-200 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/50 disabled:opacity-40 disabled:cursor-not-allowed font-cinzel text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recording State with Audio Visualizer */}
      {voiceState === 'recording' && (
        <div className="flex flex-col items-center animate-fadeIn w-full max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 -m-3 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
            <button
              id="stop-recording-button"
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-gradient-to-b from-[#2e1515] to-[#170a0a] border-2 border-red-500 text-red-200 hover:text-white hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] shadow-[0_6px_22px_rgba(239,68,68,0.4)] transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Square className="w-8 h-8 fill-red-400 text-red-400" />
            </button>
          </div>
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-cinzel tracking-widest text-cyan-200 bg-cyan-950/90 border border-cyan-400/70">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-red-400 font-bold">Listening...</span>
              <span className="text-slate-400">|</span>
              <span>0:0{recordingSeconds} / 0:0{MAX_RECORDING_SECONDS}</span>
            </div>
            <p className="text-xs font-cormorant italic text-cyan-300 mt-1.5 animate-pulse">"Sing your answer..."</p>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3 h-9 px-4 py-1.5 rounded-xl bg-black/70 border border-cyan-500/40 backdrop-blur-md w-full">
            {audioLevel.map((level, index) => (
              <div key={index} className="w-1.5 rounded-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-white transition-all duration-75" style={{ height: `${Math.max(5, level)}px` }} />
            ))}
          </div>
          <button type="button" onClick={stopRecording} className="mt-3 px-5 py-2 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500/80 text-red-200 hover:text-white font-cinzel text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all cursor-pointer">
            <Square className="w-3.5 h-3.5 fill-current" /> STOP
          </button>
        </div>
      )}

      {/* Decoding State */}
      {voiceState === 'decoding' && (
        <div className="flex flex-col items-center p-5 rounded-2xl bg-black/80 border border-cyan-500/60 shadow-[0_0_30px_rgba(56,189,248,0.3)] animate-fadeIn w-full max-w-sm text-center">
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-cyan-950/60 border border-cyan-400/80 mb-3">
            <Sparkles className="w-7 h-7 text-cyan-300 animate-spin" />
          </div>
          <span className="text-xs font-cinzel font-bold tracking-[0.2em] text-cyan-200 uppercase">Decoding your melody...</span>
          <p className="text-xs font-cormorant italic text-slate-400 mt-2">Listening to the words...</p>
        </div>
      )}

      {/* Successfully Captured Transcription Review */}
      {voiceState === 'ready_to_submit' && transcript && (
        <div id="transcription-review-box" className="w-full max-w-md p-4 rounded-xl bg-black/85 border border-cyan-500/60 backdrop-blur-md text-center shadow-[0_0_25px_rgba(56,189,248,0.3)] animate-fadeIn">
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-cyan-900/50">
            <span className="text-[11px] font-cinzel tracking-[0.2em] text-cyan-300 uppercase font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> You said:
            </span>
            <button type="button" onClick={handleReset} disabled={isProcessing || isSuccess} className="text-[11px] font-cinzel text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3 h-3" /> Sing again
            </button>
          </div>
          <div className="my-3 py-1">
            <p className="text-xl sm:text-2xl font-cormorant italic text-cyan-100 font-bold tracking-wide">"{transcript}"</p>
          </div>
          <div className="pt-2 border-t border-cyan-900/40 flex items-center justify-center gap-2">
            <button id="submit-answer-button" type="button" onClick={handleSubmit} disabled={isProcessing || isSuccess} className="flex-1 py-2.5 px-4 rounded-xl gothic-btn font-cinzel text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer text-cyan-100 hover:text-white shadow-[0_0_20px_rgba(56,189,248,0.5)]">
              <Sparkles className="w-4 h-4 text-cyan-300" /> SUBMIT ANSWER <ArrowRight className="w-3.5 h-3.5 text-cyan-300" />
            </button>
            <button type="button" onClick={handleReset} disabled={isProcessing || isSuccess} aria-label="Sing again" className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-200 cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fallback Error State */}
      {voiceState === 'error' && (
        <div className="w-full max-w-sm p-4 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-center animate-fadeIn shadow-lg">
          <div className="flex items-center justify-center gap-2 text-xs font-cinzel font-bold tracking-wider text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage || 'Something went wrong. Please try again.'}</span>
          </div>
          <div className="flex items-center justify-center mt-3">
            <button type="button" onClick={handleReset} className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-cyan-200 font-cinzel text-xs font-semibold tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-md">
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
