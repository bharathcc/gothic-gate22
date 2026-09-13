import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  StoredAnswer,
  StoredVisitorSession,
  getAlertConfig,
  getSMTPConfig,
  getWebhookUrl,
  getRuntimeConfig,
  setRuntimeConfig,
  sendNtfyNotification,
  NTFY_TOPIC,
  escapeHtml,
  stripDataUrl,
  formatAttemptTime,
  sendUniversalEmailAlert,
  sendLoginAlertEmail,
  sendPuzzleCompleteEmail,
  sendWakeDraculaCompleteEmail,
  sendMBBSQuizCompleteEmail,
  sendCoupleQuizCompleteEmail,
  sendCompletedDossierEmail,
  sendResetAlertEmail,
  sendAnswerAlertEmail,
  sendSmtpEmail,
  verifySmtpConnection,
  sendWebhookNotification,
  extractResendErrorInfo,
} from './server/emailAlerts';

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '50mb' }));

let genAIClient: GoogleGenAI | null = null;
let lastGeminiKey: string | null = null;

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'GEMINI_API_KEY' || key === 'undefined' || key === 'null' || key.length < 10) {
    return null;
  }
  if (!genAIClient || lastGeminiKey !== key) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: key });
      lastGeminiKey = key;
    } catch {
      genAIClient = null;
      return null;
    }
  }
  return genAIClient;
}

function normalizeMimeType(value: string): string {
  const mime = String(value || 'audio/webm').split(';')[0].trim().toLowerCase();
  const supported = new Set([
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg',
    'audio/flac', 'audio/mpeg', 'audio/m4a', 'audio/l16', 'audio/opus',
    'audio/alaw', 'audio/mulaw', 'audio/webm', 'audio/mp4',
  ]);
  return supported.has(mime) ? mime : 'audio/webm';
}

function safeAudioExtension(mimeType: string): string {
  const mime = normalizeMimeType(mimeType);
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

// In-memory visitor session store
const visitorSessionsMap = new Map<string, StoredVisitorSession>();

function sanitizeAnswer(answer: StoredAnswer) {
  return {
    ...answer,
    hasAudio: Boolean(answer.audioBase64 && answer.audioBase64.length > 200),
    audioBase64: undefined,
  };
}

function sanitizeSession(session: StoredVisitorSession) {
  return {
    ...session,
    answers: session.answers.map(sanitizeAnswer),
  };
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  res.json({
    status: 'ok',
    transcriptionModel: 'gemini-2.5-flash',
    geminiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
  });
});

// Voice audio transcription endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body ?? {};

    if (typeof audioBase64 !== 'string' || audioBase64.length < 100) {
      return res.status(400).json({ success: false, error: 'No usable audio recording was received.' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(200).json({
        success: false,
        isApiKeyMissing: true,
        error: 'Voice recognition is ready. You can also type your answer directly.',
      });
    }

    const data = stripDataUrl(audioBase64);
    const mime = normalizeMimeType(mimeType);

    const transcriptionPrompt =
      'You are a strict audio speech transcriber. Listen carefully to this audio recording.\n' +
      'Rules:\n' +
      '1. If there is only silence, static, humming, breathing, ambient background noise, or no distinct words spoken or sung by a human, output EXACTLY: [SILENCE]\n' +
      '2. Do NOT hallucinate, assume, or guess song lyrics or phrases if they are not clearly spoken or sung in the audio.\n' +
      '3. If clear human words or singing are present, transcribe ONLY the verbatim words heard in English or Kannada phonetic script, without commentary or timestamps.';

    let transcript = '';

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data,
              mimeType: mime,
            },
          },
          {
            text: transcriptionPrompt,
          },
        ],
      });
      transcript = result.text?.trim() || '';
    } catch (primaryErr: any) {
      console.warn('[Audio Transcribe] Primary model notice:', primaryErr?.message || primaryErr);
      try {
        const fallbackResult = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data,
                mimeType: mime,
              },
            },
            {
              text: transcriptionPrompt,
            },
          ],
        });
        transcript = fallbackResult.text?.trim() || '';
      } catch (fallbackErr: any) {
        return res.status(200).json({
          success: false,
          error: "We couldn't hear the answer clearly. Please sing it again or type it below.",
        });
      }
    }

    const cleanedTranscript = transcript.replace(/\[SILENCE\]/gi, '').trim();

    if (!cleanedTranscript || cleanedTranscript.toLowerCase() === 'silence') {
      return res.status(200).json({
        success: false,
        isSilent: true,
        error: "We couldn't hear any singing or words. Please sing the song into your microphone.",
      });
    }

    return res.json({ success: true, transcript: cleanedTranscript });
  } catch (error: any) {
    console.warn('[Audio Transcribe] notice:', error?.message || error);
    return res.status(200).json({
      success: false,
      error: 'Voice recognition could not process the recording. You can type your answer directly.',
    });
  }
});

// Gate entrance attempt alert
app.post('/api/attempt-alert', async (req, res) => {
  try {
    const {
      sessionId,
      userName,
      moniker,
      email,
      attemptNumber,
      method,
      submittedAnswer,
      isCorrect,
      timestamp,
      audioBase64,
      audioMimeType,
    } = req.body ?? {};

    if (!method || typeof submittedAnswer !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid attempt alert payload.' });
    }

    let session = sessionId ? visitorSessionsMap.get(sessionId) : undefined;
    const visitorDisplayName = userName?.trim() || session?.userName || 'Mortal Visitor';

    const attemptNum = Number(attemptNumber) || (session ? session.totalAttempts + 1 : 1);
    const isVoice = method === 'voice';
    const methodUpper = isVoice ? 'VOICE' : 'TYPED';
    const resultStatus = isCorrect ? 'CORRECT' : 'WRONG';
    const resultIcon = isCorrect ? '✅ CORRECT' : '❌ WRONG';
    const formattedTime = formatAttemptTime(timestamp);

    const audioData = typeof audioBase64 === 'string' ? stripDataUrl(audioBase64) : '';
    const hasAudio = isVoice && Boolean(audioData && audioData.length > 200);
    const extension = safeAudioExtension(audioMimeType || 'audio/webm');
    const paddedNum = String(attemptNum).padStart(2, '0');
    const attachmentFilename = `gothic-attempt-${paddedNum}-voice.${extension}`;

    const subject = `🧛 Gothic Gate — ${visitorDisplayName !== 'Mortal Visitor' ? `${visitorDisplayName}: ` : ''}${isVoice ? 'Voice' : 'Typed'} Attempt #${attemptNum} — ${resultStatus}`;

    const plainText = [
      'Someone attempted to enter the Gothic Gate.',
      '',
      `Visitor Name: ${visitorDisplayName}`,
      session?.moniker || moniker ? `Moniker / Alias: ${session?.moniker || moniker}` : '',
      session?.email || email ? `Email: ${session?.email || email}` : '',
      `Attempt: #${attemptNum}`,
      `Method: ${methodUpper}`,
      `Result: ${resultIcon}`,
      '',
      isVoice ? 'What was heard:' : 'What was typed:',
      `"${submittedAnswer}"`,
      '',
      'Time:',
      formattedTime,
      '',
      'Total attempts:',
      String(attemptNum),
      '',
      '🎙️ Original voice recording:',
      hasAudio ? `ATTACHED (${attachmentFilename})` : isVoice ? 'Not available' : 'None (Typed attempt)',
      '',
      `Session ID: ${sessionId || 'unknown'}`,
    ].filter(Boolean).join('\n');

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:580px;margin:0 auto;background:#0d131f;color:#e2e8f0;border:1px solid #1e293b;border-radius:12px;overflow:hidden;padding:24px;">
        <h2 style="margin:0 0 8px 0;color:#38bdf8;font-size:20px;">🧛 Gothic Gate Entrance Attempt</h2>
        <p style="margin:0 0 20px 0;color:#94a3b8;font-size:14px;">An entrance attempt was recorded at the Gothic Gate.</p>
        
        <div style="background:#141c2c;border:1px solid #1f2d47;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:4px 0 10px 0;font-size:15px;color:#ffffff;"><strong>👤 Visitor:</strong> <span style="color:#38bdf8;font-weight:600;">${escapeHtml(visitorDisplayName)}</span></p>
          <p style="margin:6px 0;font-size:14px;"><strong>Attempt:</strong> #${attemptNum}</p>
          <p style="margin:6px 0;font-size:14px;"><strong>Method:</strong> <span style="color:#38bdf8;font-weight:600;">${methodUpper}</span></p>
          <p style="margin:6px 0;font-size:14px;"><strong>Result:</strong> <span style="font-weight:bold;color:${isCorrect ? '#4ade80' : '#f87171'};">${resultIcon}</span></p>
          
          <div style="margin:14px 0 10px 0;padding-top:10px;border-top:1px solid #1e293b;">
            <p style="margin:0 0 4px 0;font-size:13px;color:#94a3b8;">${isVoice ? 'What was heard:' : 'What was typed:'}</p>
            <p style="margin:0;font-size:17px;font-style:italic;color:#f8fafc;font-weight:600;">"${escapeHtml(submittedAnswer)}"</p>
          </div>
          
          <div style="margin:14px 0 10px 0;padding-top:10px;border-top:1px solid #1e293b;">
            <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Time:</strong> <span style="color:#cbd5e1;">${escapeHtml(formattedTime)}</span></p>
            <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Total attempts:</strong> <span style="color:#cbd5e1;">${attemptNum}</span></p>
            <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>🎙️ Original voice recording:</strong> <span style="color:${hasAudio ? '#38bdf8' : '#94a3b8'};font-weight:${hasAudio ? 'bold' : 'normal'};">${hasAudio ? `ATTACHED (${attachmentFilename})` : isVoice ? 'Not available' : 'None (Typed attempt)'}</span></p>
          </div>
        </div>
        
        <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">Gothic Gate Alert System &bull; Session: ${escapeHtml(String(sessionId || 'unknown'))}</p>
      </div>`;

    const alertResult = await sendUniversalEmailAlert({
      subject,
      plainText,
      html,
      attachments: hasAudio && audioData ? [{ filename: attachmentFilename, content: audioData }] : undefined,
      webhookTitle: `🧛 Gothic Gate — Attempt #${attemptNum} (${resultStatus})`,
      webhookDesc: `**Visitor:** ${visitorDisplayName}\n**Submitted:** "${submittedAnswer}"\n**Method:** ${methodUpper}`,
      webhookFields: [
        { name: 'Result', value: resultIcon },
        { name: 'Time', value: formattedTime },
        { name: 'Voice Recording', value: hasAudio ? 'Audio recorded and attached' : 'None (Typed)' },
      ],
    });

    console.log(`[Attempt Alert] Recorded attempt #${attemptNum} for "${visitorDisplayName}" (${methodUpper}) - Delivered: ${alertResult.ok ? 'YES' : 'NO'}`);

    return res.json({
      success: true,
      emailSent: alertResult.ok,
      id: alertResult.id,
    });
  } catch (error: any) {
    console.warn('[Attempt Alert] Notice:', error?.message || error);
    return res.status(200).json({ success: true, localOnly: true, error: 'Saved locally' });
  }
});

// Diagnostic status endpoint
app.get('/api/alert-status', async (_req, res) => {
  const { apiKey, to, from } = getAlertConfig();
  const hasKey = Boolean(apiKey && apiKey.length > 5);
  const keyPrefix = hasKey ? apiKey.slice(0, 5) + '...' : 'none';

  return res.json({
    configured: hasKey,
    keyPrefix,
    recipient: to,
    sender: from,
  });
});

// Register or update visitor session
app.post('/api/visitor/session', (req, res) => {
  const { sessionId, userName, moniker, email } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  const existing = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (existing) {
    const isNameChanged = userName && userName.trim() !== existing.userName;
    existing.userName = userName?.trim() || existing.userName || 'Mortal Visitor';
    existing.moniker = moniker?.trim() || existing.moniker;
    existing.email = email?.trim() || existing.email;

    if (isNameChanged) {
      sendLoginAlertEmail(existing, true).catch((err) => console.error('[Alert Notice] sendLoginAlertEmail update error:', err?.message || err));
    }

    return res.json({ success: true, session: sanitizeSession(existing) });
  }

  const newSession: StoredVisitorSession = {
    sessionId,
    userName: userName?.trim() || 'Mortal Visitor',
    moniker: moniker?.trim() || '',
    email: email?.trim() || '',
    loginTime: now,
    status: 'in_progress',
    startTime: now,
    totalAttempts: 0,
    answers: [],
  };

  visitorSessionsMap.set(sessionId, newSession);
  console.log(`[Visitor Store] Registered login for: "${newSession.userName}" (${sessionId})`);
  sendLoginAlertEmail(newSession, false).catch((err) => console.error('[Alert Notice] sendLoginAlertEmail new login error:', err?.message || err));

  return res.json({ success: true, session: sanitizeSession(newSession) });
});

// Visitor reset or restart notification endpoint
app.post('/api/visitor/reset', (req, res) => {
  const { sessionId, stageName } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  const session = visitorSessionsMap.get(sessionId);
  if (session) {
    console.log(`[Visitor Store] Reset/restart triggered for "${session.userName}" at ${stageName || 'Entrance'}`);
    sendResetAlertEmail(session, stageName || 'Entrance').catch((err) => console.error('[Alert Notice] sendResetAlertEmail error:', err?.message || err));
  }

  return res.json({ success: true });
});

// Record a question answer with optional audio recording
app.post('/api/visitor/record-answer', (req, res) => {
  const {
    sessionId,
    questionId,
    questionNumber,
    questionTitle,
    questionPrompt,
    answer,
    normalizedAnswer,
    method,
    isCorrect,
    audioBase64,
    audioMimeType,
  } = req.body ?? {};

  if (!sessionId || !questionId) {
    return res.status(400).json({ success: false, error: 'sessionId and questionId are required' });
  }

  let session = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      userName: 'Mortal Visitor',
      loginTime: now,
      status: 'in_progress',
      startTime: now,
      totalAttempts: 0,
      answers: [],
    };
    visitorSessionsMap.set(sessionId, session);
  }

  session.totalAttempts += 1;

  const audioData = typeof audioBase64 === 'string' ? stripDataUrl(audioBase64) : '';
  const isVoice = method === 'voice';
  const hasAudio = isVoice && Boolean(audioData && audioData.length > 200);
  const extension = safeAudioExtension(audioMimeType || 'audio/webm');
  const qNum = Number(questionNumber) || (session.answers.length + 1);
  const paddedNum = String(qNum).padStart(2, '0');
  const attachmentFilename = hasAudio ? `gothic-q${paddedNum}-${questionId}-voice.${extension}` : undefined;

  const existingIdx = session.answers.findIndex((a) => a.questionId === questionId);
  const answerRecord: StoredAnswer = {
    questionId,
    questionNumber: qNum,
    questionTitle: questionTitle || `Question #${qNum}`,
    questionPrompt: questionPrompt || '',
    answer: String(answer || '').trim(),
    normalizedAnswer,
    method: isVoice ? 'voice' : 'typed',
    isCorrect: isCorrect ?? true,
    timestamp: now,
    audioBase64: hasAudio ? audioData : undefined,
    audioMimeType: hasAudio ? audioMimeType : undefined,
    attachmentFilename,
  };

  if (existingIdx >= 0) {
    session.answers[existingIdx] = answerRecord;
  } else {
    session.answers.push(answerRecord);
  }

  console.log(`[Visitor Store] Saved answer for "${session.userName}" - Q${qNum} (${questionId}): "${answerRecord.answer.slice(0, 40)}" (audio: ${hasAudio ? 'yes' : 'no'})`);
  
  // Instant per-answer email dispatch
  sendAnswerAlertEmail(session, answerRecord).catch((err) => console.error('[Alert Notice] sendAnswerAlertEmail error:', err?.message || err));

  return res.json({ success: true, answer: sanitizeAnswer(answerRecord), totalAnswers: session.answers.length });
});

// Record Chapter II Photo Puzzle Completion or Attempt Result
app.post('/api/puzzle/complete', (req, res) => {
  const { sessionId, moves, timeTakenSeconds, timeRemainingSeconds, attemptNumber, status, puzzleMode } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  let session = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      userName: 'Mortal Visitor',
      loginTime: now,
      status: 'in_progress',
      startTime: now,
      totalAttempts: 0,
      answers: [],
    };
    visitorSessionsMap.set(sessionId, session);
  }

  const mode = (puzzleMode === 'hard' ? 'hard' : 'easy') as 'easy' | 'hard';
  const modeLabel = mode === 'easy' ? '3x3 Easy Mode' : '6x6 Hard Mode';
  const isSolved = status === 'solved' || status === undefined;

  const puzzleRecord: StoredAnswer = {
    questionId: 'page2_photo_puzzle',
    questionNumber: 2,
    questionTitle: `Chapter II: The Broken Memory Puzzle (${modeLabel})`,
    questionPrompt: mode === 'easy'
      ? 'Rearrange all 9 broken memory photograph pieces within 60 seconds (Easy Mode).'
      : 'Rearrange all 36 broken memory photograph pieces within 60 seconds (Hard Mode).',
    answer: isSolved
      ? `[${modeLabel}] Solved in Attempt #${attemptNumber || 1} with ${moves || 0} moves (${timeTakenSeconds || 0}s taken, ${timeRemainingSeconds || 0}s remaining)`
      : `[${modeLabel}] Attempt #${attemptNumber || 1} Failed (Time expired after 60s, ${moves || 0} moves)`,
    method: 'typed',
    isCorrect: isSolved,
    timestamp: now,
  };

  const existingIdx = session.answers.findIndex((a) => a.questionId === 'page2_photo_puzzle');
  if (existingIdx >= 0) {
    session.answers[existingIdx] = puzzleRecord;
  } else {
    session.answers.push(puzzleRecord);
  }

  console.log(`[Puzzle Attempt] "${session.userName}" - ${modeLabel} Attempt #${attemptNumber || 1} result: ${isSolved ? 'SOLVED' : 'TIMEOUT'}`);
  
  // Send dedicated Chapter II Puzzle Solved alert email
  sendPuzzleCompleteEmail(session, {
    moves: Number(moves) || 0,
    timeTakenSeconds: Number(timeTakenSeconds) || 0,
    timeRemainingSeconds: Number(timeRemainingSeconds) || 0,
    puzzleMode: mode,
    attemptNumber: Number(attemptNumber) || 1,
    isSolved,
  }).catch((err) => console.error('[Alert Notice] sendPuzzleCompleteEmail error:', err?.message || err));

  return res.json({ success: true, record: sanitizeAnswer(puzzleRecord) });
});

// Record Chapter III Wake Dracula Complete
app.post('/api/wake-dracula/complete', (req, res) => {
  const { sessionId, clicks, timeTakenSeconds, timeRemainingSeconds } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  let session = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      userName: 'Mortal Visitor',
      loginTime: now,
      status: 'in_progress',
      startTime: now,
      totalAttempts: 0,
      answers: [],
    };
    visitorSessionsMap.set(sessionId, session);
  }

  const wakeRecord: StoredAnswer = {
    questionId: 'page3_wake_dracula',
    questionNumber: 3,
    questionTitle: 'Chapter III: Awakening Lord Dracula',
    questionPrompt: 'Poke and wake up Dracula 20 times within 20 seconds to claim the Castle Key.',
    answer: `Dracula Awakened! (${clicks || 20} pokes completed in ${timeTakenSeconds || 0}s - ${timeRemainingSeconds || 0}s remaining). Golden Key Claimed.`,
    method: 'typed',
    isCorrect: true,
    timestamp: now,
  };

  const existingIdx = session.answers.findIndex((a) => a.questionId === 'page3_wake_dracula');
  if (existingIdx >= 0) {
    session.answers[existingIdx] = wakeRecord;
  } else {
    session.answers.push(wakeRecord);
  }

  console.log(`[Wake Dracula] "${session.userName}" successfully awakened Dracula in ${timeTakenSeconds}s.`);

  // Send dedicated Chapter III Dracula Awakened alert email
  sendWakeDraculaCompleteEmail(session, {
    clicks: Number(clicks) || 20,
    timeTakenSeconds: Number(timeTakenSeconds) || 0,
    timeRemainingSeconds: Number(timeRemainingSeconds) || 0,
  }).catch((err) => console.error('[Alert Notice] sendWakeDraculaCompleteEmail error:', err?.message || err));

  return res.json({ success: true, record: sanitizeAnswer(wakeRecord) });
});

// Record Chapter IV MBBS Quiz Complete (with full 10 questions breakdown)
app.post('/api/quiz/mbbs-complete', (req, res) => {
  const { sessionId, score, totalQuestions, tierTitle, questions } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  let session = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      userName: 'Mortal Visitor',
      loginTime: now,
      status: 'in_progress',
      startTime: now,
      totalAttempts: 0,
      answers: [],
    };
    visitorSessionsMap.set(sessionId, session);
  }

  const scoreNum = Number(score) || 0;
  const totalNum = Number(totalQuestions) || 10;
  const percent = Math.round((scoreNum / totalNum) * 100);

  const mbbsRecord: StoredAnswer = {
    questionId: 'page4_mbbs_quiz',
    questionNumber: 4,
    questionTitle: 'Chapter IV: Dr. Dracula MBBS Medical Board Exam',
    questionPrompt: 'Answer 10 diagnostic clinical pathology and hematology questions.',
    answer: `Score: ${scoreNum}/${totalNum} (${percent}%) - Medical Diagnosis: ${tierTitle || 'Dr. Dracula Specialist'}`,
    method: 'typed',
    isCorrect: scoreNum >= 7,
    timestamp: now,
  };

  const existingIdx = session.answers.findIndex((a) => a.questionId === 'page4_mbbs_quiz');
  if (existingIdx >= 0) {
    session.answers[existingIdx] = mbbsRecord;
  } else {
    session.answers.push(mbbsRecord);
  }

  console.log(`[MBBS Quiz] "${session.userName}" finished MBBS quiz with score ${scoreNum}/${totalNum} (${percent}%).`);

  // Send dedicated MBBS Exam Results Email with all 10 questions breakdown
  sendMBBSQuizCompleteEmail(session, {
    score: scoreNum,
    totalQuestions: totalNum,
    tierTitle: tierTitle || 'Dr. Dracula Board Certified',
    questions: Array.isArray(questions) ? questions : [],
  }).catch((err) => console.error('[Alert Notice] sendMBBSQuizCompleteEmail error:', err?.message || err));

  return res.json({ success: true, record: sanitizeAnswer(mbbsRecord) });
});

// Record Chapter V Couple Quiz Complete (with all 10 questions & reactions)
app.post('/api/quiz/couple-complete', (req, res) => {
  const { sessionId, draculaCount, skCount, questions } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  let session = visitorSessionsMap.get(sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      userName: 'Mortal Visitor',
      loginTime: now,
      status: 'in_progress',
      startTime: now,
      totalAttempts: 0,
      answers: [],
    };
    visitorSessionsMap.set(sessionId, session);
  }

  const dCount = Number(draculaCount) || 0;
  const sCount = Number(skCount) || 0;

  const coupleRecord: StoredAnswer = {
    questionId: 'page5_couple_quiz',
    questionNumber: 5,
    questionTitle: 'Chapter V: Dracula vs SK Couple Edition Trivia',
    questionPrompt: 'Answer 10 couple trivia questions (Who is more dramatic, romantic, stubborn, etc.).',
    answer: `Dracula Selected: ${dCount} times | SK Selected: ${sCount} times`,
    method: 'typed',
    isCorrect: true,
    timestamp: now,
  };

  const existingIdx = session.answers.findIndex((a) => a.questionId === 'page5_couple_quiz');
  if (existingIdx >= 0) {
    session.answers[existingIdx] = coupleRecord;
  } else {
    session.answers.push(coupleRecord);
  }

  console.log(`[Couple Quiz] "${session.userName}" finished couple quiz (Dracula: ${dCount}, SK: ${sCount}).`);

  // Send dedicated Couple Quiz Results Email with all 10 questions breakdown
  sendCoupleQuizCompleteEmail(session, {
    draculaCount: dCount,
    skCount: sCount,
    questions: Array.isArray(questions) ? questions : [],
  }).catch((err) => console.error('[Alert Notice] sendCoupleQuizCompleteEmail error:', err?.message || err));

  return res.json({ success: true, record: sanitizeAnswer(coupleRecord) });
});

// Complete the quest: aggregates all answers and dispatches the Complete Quest Dossier Email
app.post('/api/visitor/complete-quest', async (req, res) => {
  const { sessionId } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  const session = visitorSessionsMap.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  const completedTime = new Date().toISOString();
  session.completedTime = completedTime;
  session.status = 'completed';

  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(completedTime).getTime();
  session.durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));

  console.log(`[Visitor Store] Quest completed by "${session.userName}" in ${session.durationSeconds}s with ${session.answers.length} answers.`);

  // Send Comprehensive Completed Dossier Email (ALL 6 Chapters + Voice Audio Attachments)
  try {
    const emailResult = await sendCompletedDossierEmail(session);
    if (emailResult.ok) {
      session.emailSent = true;
      session.emailSentAt = new Date().toISOString();
      session.emailError = undefined;
    } else {
      session.emailSent = false;
      session.emailError = emailResult.error;
    }
  } catch (err: any) {
    console.error('[Visitor Store] Error triggering dossier email:', err?.message || err);
    session.emailSent = false;
    session.emailError = err?.message || 'Email delivery failed';
  }

  return res.json({
    success: true,
    session: sanitizeSession(session),
    emailSent: session.emailSent,
  });
});

// Get all visitor session records (for Admin / Dossier Explorer)
app.get('/api/visitor/records', (_req, res) => {
  const records = Array.from(visitorSessionsMap.values())
    .map(sanitizeSession)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return res.json({ success: true, count: records.length, records });
});

// Reset single session or current user session
app.post('/api/visitor/reset', (req, res) => {
  const { sessionId } = req.body ?? {};
  if (sessionId && visitorSessionsMap.has(sessionId)) {
    visitorSessionsMap.delete(sessionId);
  }
  return res.json({ success: true, message: 'Session reset successfully' });
});

// Reset ALL visitor records and sessions completely
app.post('/api/visitor/reset-all', (_req, res) => {
  visitorSessionsMap.clear();
  console.log('[Visitor Store] All visitor records and sessions have been cleared.');
  return res.json({ success: true, message: 'All visitor records and sessions have been cleared.' });
});

// Stream audio for a recorded answer
app.get('/api/visitor/audio/:sessionId/:questionId', (req, res) => {
  const { sessionId, questionId } = req.params;
  const session = visitorSessionsMap.get(sessionId);
  if (!session) {
    return res.status(404).send('Session not found');
  }

  const ans = session.answers.find((a) => a.questionId === questionId);
  if (!ans || !ans.audioBase64) {
    return res.status(404).send('Audio not found');
  }

  const raw = stripDataUrl(ans.audioBase64);
  const buffer = Buffer.from(raw, 'base64');
  res.setHeader('Content-Type', ans.audioMimeType || 'audio/webm');
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

// Standalone downloadable HTML dossier
app.get('/api/visitor/export-html/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = visitorSessionsMap.get(sessionId);
  if (!session) {
    return res.status(404).send('Session not found');
  }

  const rows = session.answers.map((ans, idx) => `
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="color: #ec4899; font-weight: bold;">Question #${ans.questionNumber || idx + 1}: ${escapeHtml(ans.questionTitle)}</span>
        <span style="font-size: 12px; color: #9ca3af;">${escapeHtml(formatAttemptTime(ans.timestamp))}</span>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0;">${escapeHtml(ans.questionPrompt)}</p>
      <div style="background: #030712; border-left: 3px solid #ec4899; padding: 8px 12px; color: #fff; font-size: 15px; font-style: italic;">
        "${escapeHtml(ans.answer)}"
      </div>
      <div style="margin-top: 6px; font-size: 12px; color: #6b7280;">
        Method: <b>${ans.method.toUpperCase()}</b> &bull; ${ans.audioBase64 ? '🎙️ Audio Recording Saved' : '⌨️ Typed Answer'}
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Gothic Quest Dossier - ${escapeHtml(session.userName)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #030712; color: #f3f4f6; margin: 0; padding: 40px 20px; }
        .container { max-width: 700px; margin: 0 auto; background: #0a0f1d; border: 1px solid #1f2937; border-radius: 12px; padding: 28px; }
        h1 { color: #f43f5e; margin: 0 0 8px 0; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #111827; padding: 14px; border-radius: 8px; margin: 16px 0 24px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏰 Gothic Quest Completed Dossier</h1>
        <p style="color: #9ca3af; margin: 0 0 16px 0;">All visitor choices, answers, and interactions.</p>
        <div class="stats">
          <div><strong>Visitor:</strong> ${escapeHtml(session.userName)}</div>
          <div><strong>Total Answers:</strong> ${session.answers.length}</div>
          <div><strong>Completed:</strong> ${escapeHtml(formatAttemptTime(session.completedTime))}</div>
          <div><strong>Session ID:</strong> <code>${escapeHtml(session.sessionId)}</code></div>
        </div>
        <h2>Recorded Questions & Answers</h2>
        ${rows}
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="gothic-dossier-${session.userName.replace(/[^a-zA-Z0-9]/g, '_')}.html"`);
  return res.send(html);
});

// Admin delivery status
app.get('/api/admin/status', (_req, res) => {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();
  const runtime = getRuntimeConfig();

  return res.json({
    recipient: to,
    sender: from,
    ntfy: {
      configured: runtime.enableNtfy !== false,
      topic: NTFY_TOPIC,
      topicUrl: `https://ntfy.sh/${NTFY_TOPIC}`,
      forwardEmail: to[0] || 'kmsiddesh009@gmail.com',
    },
    smtp: {
      configured: Boolean(smtpConfig),
      user: smtpConfig ? smtpConfig.user : null,
      host: smtpConfig ? smtpConfig.host : null,
      port: smtpConfig ? smtpConfig.port : null,
    },
    resend: {
      configured: Boolean(apiKey && apiKey.length > 5),
      keyPrefix: apiKey && apiKey.length > 5 ? apiKey.slice(0, 5) + '...' : null,
    },
    webhook: {
      configured: Boolean(webhookUrl),
      type: webhookUrl ? (webhookUrl.includes('discord.com') ? 'discord' : 'custom') : null,
    },
    totalSessionsRecorded: visitorSessionsMap.size,
  });
});

// Update runtime email config dynamically
app.post('/api/admin/config', (req, res) => {
  const { smtpUser, smtpPass, smtpHost, smtpPort, resendApiKey, alertEmailTo, webhookUrl, enableNtfy } = req.body || {};
  setRuntimeConfig({
    ...(smtpUser !== undefined ? { smtpUser: String(smtpUser).trim() } : {}),
    ...(smtpPass !== undefined ? { smtpPass: String(smtpPass).trim() } : {}),
    ...(smtpHost !== undefined ? { smtpHost: String(smtpHost).trim() } : {}),
    ...(smtpPort !== undefined ? { smtpPort: Number(smtpPort) || 465 } : {}),
    ...(resendApiKey !== undefined ? { resendApiKey: String(resendApiKey).trim() } : {}),
    ...(alertEmailTo !== undefined ? { alertEmailTo: String(alertEmailTo).trim() } : {}),
    ...(webhookUrl !== undefined ? { webhookUrl: String(webhookUrl).trim() } : {}),
    ...(enableNtfy !== undefined ? { enableNtfy: Boolean(enableNtfy) } : {}),
  });

  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const wh = getWebhookUrl();

  return res.json({
    success: true,
    message: 'Configuration updated successfully!',
    recipient: to,
    sender: from,
    smtpConfigured: Boolean(smtpConfig),
    resendConfigured: Boolean(apiKey && apiKey.length > 5),
    webhookConfigured: Boolean(wh),
    ntfyTopic: NTFY_TOPIC,
  });
});

// Verify SMTP server credentials and connectivity
app.post('/api/admin/verify-smtp', async (_req, res) => {
  const smtpConfig = getSMTPConfig();
  if (!smtpConfig) {
    return res.json({
      ok: false,
      configured: false,
      error: 'SMTP credentials not configured. Please enter your Gmail address and 16-character App Password.',
    });
  }

  const verification = await verifySmtpConnection();
  return res.json({
    ...verification,
    configured: true,
  });
});

// Test dispatch across all channels
app.post('/api/admin/test-dispatch', async (_req, res) => {
  const { apiKey, to } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();
  const runtime = getRuntimeConfig();

  const results: any = {
    recipient: to,
    ntfy: null,
    smtp: null,
    resend: null,
    webhook: null,
  };

  // 1. Test ntfy.sh (Zero-config instant cloud notification + email forward)
  try {
    const ntfyRes = await sendNtfyNotification({
      title: '🧛 Gothic Gate — Test Cloud Alert',
      message: `Test alert dispatched from Gothic Castle Gatekeeper to ${to.join(', ')}.\nAll quiz attempts, answers, and scores will be sent in real time!`,
      tags: ['vampire', 'tada', 'trophy'],
      priority: 'high',
      forwardEmail: to[0] || 'kmsiddesh009@gmail.com',
    });
    results.ntfy = {
      ok: ntfyRes.ok,
      topicUrl: `https://ntfy.sh/${NTFY_TOPIC}`,
      forwardEmail: to[0] || 'kmsiddesh009@gmail.com',
    };
  } catch (err: any) {
    results.ntfy = { ok: false, error: err?.message };
  }

  // 2. Test SMTP
  if (smtpConfig) {
    const smtpRes = await sendSmtpEmail({
      to,
      subject: '🧛 Gothic Gate — Test Email via Gmail SMTP',
      text: `Congratulations! Your Gmail SMTP integration is active and working. You will receive all entrance attempts, MBBS quiz attempts, couple trivia, and complete dossiers directly at ${to.join(', ')}.`,
      html: `
        <div style="background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px; font-family: sans-serif;">
          <h2 style="color: #38bdf8;">🏰 Gothic Gate SMTP Test</h2>
          <p>Your Gmail SMTP connection is working perfectly!</p>
          <p>All visitor riddle answers, MBBS quiz scores, couple trivia choices, and voice recordings will be delivered directly to <strong>${escapeHtml(to.join(', '))}</strong>.</p>
        </div>
      `,
    });
    results.smtp = smtpRes;
  } else {
    results.smtp = { ok: false, error: 'SMTP not configured yet (Enter Gmail address & 16-character App Password)' };
  }

  // 3. Test Resend
  if (apiKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to,
          subject: '🧛 Gothic Gate — Test Email via Resend',
          text: 'This is a test alert from your Gothic Gate entrance application.',
        }),
      });
      const data = await resp.json().catch(() => null);
      results.resend = { ok: resp.ok, status: resp.status, data };
    } catch (err: any) {
      results.resend = { ok: false, error: err?.message };
    }
  } else {
    results.resend = { ok: false, error: 'Resend not configured (Enter RESEND_API_KEY if desired)' };
  }

  // 4. Test Webhook
  if (webhookUrl) {
    const whRes = await sendWebhookNotification({
      title: '🧛 Gothic Gate — Test Alert',
      description: `Webhook integration is working properly! All visitor activities are delivered to ${to.join(', ')}.`,
      fields: [{ name: 'Test Status', value: '✅ Connected' }],
    });
    results.webhook = whRes;
  } else {
    results.webhook = { ok: false, error: 'Webhook not configured' };
  }

  const anySuccess = Boolean(
    (results.ntfy && results.ntfy.ok) ||
    (results.smtp && results.smtp.ok) ||
    (results.resend && results.resend.ok) ||
    (results.webhook && results.webhook.ok)
  );

  return res.json({
    success: anySuccess,
    results,
    ntfyTopicUrl: `https://ntfy.sh/${NTFY_TOPIC}`,
    advice: results.smtp?.ok
      ? `✅ Direct Gmail SMTP is active! Emails are being delivered to ${to.join(', ')}.`
      : `🚀 Zero-config Cloud Alerts are active on https://ntfy.sh/${NTFY_TOPIC} and forwarded to ${to.join(', ')}. To also receive direct Gmail inbox delivery, simply enter your Gmail App Password in the Email tab below!`,
  });
});

// Resend completed dossier for a session
app.post('/api/visitor/resend-dossier/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = visitorSessionsMap.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  try {
    const result = await sendCompletedDossierEmail(session);
    if (result.ok) {
      session.emailSent = true;
      session.emailSentAt = new Date().toISOString();
      return res.json({ success: true, message: `Dossier dispatched to ${process.env.ALERT_EMAIL_TO || 'kmsiddesh009@gmail.com'}` });
    } else {
      return res.status(200).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || 'Error sending dossier' });
  }
});

// Test email endpoint
app.post('/api/test-email', async (_req, res) => {
  try {
    const { apiKey, to } = getAlertConfig();
    const smtpConfig = getSMTPConfig();

    if (smtpConfig) {
      const smtpRes = await sendSmtpEmail({
        to,
        subject: '🧛 Gothic Gate — Test Alert via Gmail SMTP',
        text: 'This is a test alert from your Gothic Gate entrance application via SMTP. Email notifications are working!',
        html: '<p>This is a test alert from your Gothic Gate entrance application via SMTP. Email notifications are working!</p>',
      });
      if (smtpRes.ok) {
        return res.json({ success: true, message: `Test email sent to ${to.join(', ')} via SMTP` });
      }
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'Neither SMTP nor RESEND_API_KEY is configured in Settings. Tip: You can set SMTP_USER and SMTP_PASS (Gmail App Password) or a WEBHOOK_URL!',
      });
    }

    let response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: to,
        subject: '🧛 Gothic Gate — Test Alert',
        text: 'This is a test alert from your Gothic Gate entrance application. Email notifications are working!',
      }),
    });

    let payload = await response.json().catch(() => null);

    if (!response.ok) {
      const { ownerEmail } = extractResendErrorInfo(payload);
      if (ownerEmail) {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [ownerEmail],
            subject: '🧛 Gothic Gate — Test Alert',
            text: 'This is a test alert from your Gothic Gate entrance application. Email notifications are working!',
          }),
        });
        payload = await response.json().catch(() => null);
      }
    }

    if (!response.ok) {
      const { message, name } = extractResendErrorInfo(payload);
      const isKeyError =
        response.status === 401 ||
        (message && (message.toLowerCase().includes('api key') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('unauthorized'))) ||
        name === 'invalid_api_key' ||
        name === 'missing_api_key';

      return res.status(200).json({
        success: false,
        error: isKeyError
          ? 'Resend API key is not valid. Alternatively, use Gmail SMTP by setting SMTP_USER and SMTP_PASS.'
          : (message || name || 'Resend error'),
        details: payload,
      });
    }

    return res.json({ success: true, id: payload?.id, message: `Test email sent to ${to.join(', ')}` });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || 'Server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Castle Gatekeeper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
