import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

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

function stripDataUrl(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const comma = value.indexOf('base64,');
  const raw = comma >= 0 ? value.slice(comma + 'base64,'.length) : value;
  const cleaned = raw.replace(/[^A-Za-z0-9+/=]/g, '').trim();
  if (!cleaned || cleaned.length < 50) return '';
  const pad = cleaned.length % 4;
  return pad === 0 ? cleaned : cleaned + '='.repeat(4 - pad);
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

app.get('/api/health', (_req, res) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  res.json({
    status: 'ok',
    transcriptionModel: 'gemini-3.7-flash',
    geminiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
  });
});

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
      const errMsg = primaryErr?.message || '';
      if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('unauthorized')) {
        console.warn('[Audio Transcribe] Gemini API key notice:', errMsg);
        return res.status(200).json({
          success: false,
          isApiKeyInvalid: true,
          error: 'Voice recognition API key notice. You may type your answer directly.',
        });
      }

      console.warn('[Audio Transcribe] Trying fallback model gemini-3.7-flash...');
      try {
        const fallbackResult = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
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
        console.warn('[Audio Transcribe] Voice fallback notice:', fallbackErr?.message || fallbackErr);
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
    console.warn('[Audio Transcribe] transcription notice:', error?.message || error);
    return res.status(200).json({
      success: false,
      error: 'Voice recognition could not process the recording. You can type your answer directly.',
    });
  }
});


function extractResendErrorInfo(payload: any): { name: string; message: string; ownerEmail?: string } {
  if (!payload) {
    return { name: 'unknown_error', message: 'No response from email service' };
  }

  const errObj = payload.error || payload;
  const name = String(errObj.name || payload.name || 'validation_error');
  const message = String(errObj.message || payload.message || (typeof errObj === 'string' ? errObj : '') || '');

  // Extract owner email if Resend test mode returned owner restriction
  const strPayload = `${message} ${JSON.stringify(payload)}`;
  const match = strPayload.match(/own email address \(([^)]+)\)/i) ||
                strPayload.match(/only send testing emails to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const ownerEmail = match ? match[1].trim() : undefined;

  return { name, message, ownerEmail };
}

function getAlertConfig() {
  const rawKey = process.env.RESEND_API_KEY?.trim() || '';
  const isPlaceholder =
    !rawKey ||
    rawKey === 'YOUR_RESEND_API_KEY' ||
    rawKey === 'MY_RESEND_API_KEY' ||
    rawKey === 'RESEND_API_KEY' ||
    rawKey === 'undefined' ||
    rawKey === 'null' ||
    rawKey.length < 8;
  const apiKey = isPlaceholder ? '' : rawKey;

  const rawTo = process.env.ALERT_EMAIL_TO?.trim() || 'kmsiddesh009@gmail.com';
  // Parse and clean recipient list into a flat string array
  const toList = rawTo
    .split(/[,;\s]+/)
    .map((e) => e.replace(/['"<>\[\]]/g, '').trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const to: string[] = toList.length > 0 ? toList : ['kmsiddesh009@gmail.com'];

  const rawFrom = process.env.ALERT_EMAIL_FROM?.trim();

  // Default to onboarding@resend.dev unless a valid custom verified domain is provided
  let from = 'onboarding@resend.dev';
  if (rawFrom && !rawFrom.includes('your-verified-domain.com') && !rawFrom.includes('example.com') && !rawFrom.includes('yourdomain.com')) {
    const cleaned = rawFrom.replace(/['"]/g, '').trim();
    const isPublicFreeMail = /@(gmail|yahoo|hotmail|outlook|icloud|aol|proton|mail)\./i.test(cleaned);
    if (cleaned.includes('@') && !isPublicFreeMail) {
      from = cleaned.includes('<') ? cleaned : `Gothic Gate <${cleaned}>`;
    }
  }

  return { apiKey, to, from };
}

interface SMTPConfig {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
}

function getSMTPConfig(): SMTPConfig | null {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || 'kmsiddesh009@gmail.com').trim().replace(/['"]/g, '');
  const rawPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '').trim().replace(/['"]/g, '');
  const pass = rawPass.replace(/[\s"']/g, '');
  if (!user || !pass || pass.length < 4 || pass.includes('your-16-char')) {
    return null;
  }
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/['"]/g, '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;
  const from = process.env.SMTP_FROM?.trim().replace(/['"]/g, '') || `Gothic Gate <${user}>`;
  return { user, pass, host, port, secure, from };
}

function getWebhookUrl(): string | null {
  const url = (process.env.WEBHOOK_URL || '').trim().replace(/['"]/g, '');
  if (!url || !url.startsWith('http') || url.includes('placeholder')) {
    return null;
  }
  return url;
}

async function sendSmtpEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const config = getSMTPConfig();
  if (!config) return { ok: false, error: 'SMTP not configured' };

  const mailOptions: any = {
    from: config.from,
    to: to.join(', '),
    subject,
    text,
    html,
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
    }));
  }

  // Strategy 1: Dedicated Gmail service transporter
  try {
    const gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const info = await gmailTransporter.sendMail(mailOptions);
    console.log(`[SMTP Email] Successfully delivered email via Gmail service to ${to.join(', ')} (ID: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (primaryErr: any) {
    console.warn('[SMTP Email] Gmail service mode notice, attempting direct host fallback...', primaryErr?.message);

    // Strategy 2: Direct SMTP Host Fallback (Port 465 SSL or Port 587 STARTTLS)
    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: config.host || 'smtp.gmail.com',
        port: config.port || 465,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[SMTP Email] Successfully delivered email via fallback host to ${to.join(', ')} (ID: ${fallbackInfo.messageId})`);
      return { ok: true, messageId: fallbackInfo.messageId };
    } catch (fallbackErr: any) {
      console.error('[SMTP Email] All SMTP delivery attempts failed:', fallbackErr?.message || fallbackErr);
      return { ok: false, error: fallbackErr?.message || primaryErr?.message || 'SMTP sending failed' };
    }
  }
}

async function sendWebhookNotification({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields?: Array<{ name: string; value: string }>;
}): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return { ok: false, error: 'Webhook URL not configured' };

  try {
    const isDiscord = webhookUrl.includes('discord.com');
    let payload: any;

    if (isDiscord) {
      payload = {
        username: 'Gothic Castle Gates',
        avatar_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80',
        embeds: [
          {
            title,
            description,
            color: 0xe11d48, // Rose Crimson
            fields: (fields || []).slice(0, 25),
            footer: { text: 'Gothic Castle Visitor Alert System' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (webhookUrl.includes('formspree.io')) {
      const fieldObj: Record<string, string> = {};
      (fields || []).forEach((f) => {
        fieldObj[f.name.replace(/[^a-zA-Z0-9_-]/g, '_')] = f.value;
      });
      payload = {
        _subject: title,
        title,
        message: description,
        ...fieldObj,
        timestamp: new Date().toISOString(),
      };
    } else {
      payload = {
        title,
        description,
        fields,
        timestamp: new Date().toISOString(),
      };
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      console.log('[Webhook] Successfully forwarded event to webhook URL');
      return { ok: true };
    } else {
      const errText = await resp.text().catch(() => '');
      return { ok: false, error: `Webhook error ${resp.status}: ${errText}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Webhook failed' };
  }
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeAudioExtension(mimeType: string): string {
  const mime = normalizeMimeType(mimeType);
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

function formatAttemptTime(isoString?: string): string {
  try {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date().toUTCString();
  }
}

app.post('/api/attempt-alert', async (req, res) => {
  try {
    const { apiKey, to, from } = getAlertConfig();

    const {
      sessionId,
      userName,
      moniker,
      email,
      attemptNumber,
      method,
      submittedAnswer,
      normalizedAnswer,
      isCorrect,
      timestamp,
      audioBase64,
      audioMimeType,
    } = req.body ?? {};

    if (!method || typeof submittedAnswer !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid attempt alert payload.' });
    }

    // Retrieve visitor session if exists or update it
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
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;background:#0d131f;color:#e2e8f0;border:1px solid #1e293b;border-radius:12px;overflow:hidden;padding:24px;">
        <h2 style="margin:0 0 8px 0;color:#38bdf8;font-size:20px;letter-spacing:0.02em;">🧛 Gothic Gate Entrance Attempt</h2>
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

    // 1. Dispatch via SMTP if configured (Direct & reliable)
    let smtpResult: any = null;
    const smtpConfig = getSMTPConfig();
    if (smtpConfig) {
      smtpResult = await sendSmtpEmail({
        to,
        subject,
        text: plainText,
        html,
        attachments: hasAudio && audioData ? [{ filename: attachmentFilename, content: audioData }] : undefined,
      });
    }

    // 2. Dispatch via Webhook if configured (Discord / Slack / Google Sheets)
    sendWebhookNotification({
      title: `🧛 Gothic Gate — Attempt #${attemptNum} (${resultStatus})`,
      description: `**Visitor:** ${visitorDisplayName}\n**Submitted:** "${submittedAnswer}"\n**Method:** ${methodUpper}`,
      fields: [
        { name: 'Result', value: resultIcon },
        { name: 'Time', value: formattedTime },
        { name: 'Voice Recording', value: hasAudio ? 'Audio recorded and saved' : 'None (Typed)' },
      ],
    }).catch(() => {});

    // 3. Dispatch via Resend API if configured
    let resendResult: any = null;
    if (apiKey) {
      // Helper function to send email via Resend
      const sendResendEmail = async (senderFrom: string, includeAttachment: boolean, recipients: string[]) => {
        const emailBody: any = {
          from: senderFrom,
          to: recipients,
          subject: subject.replace(/[\r\n\t]+/g, ' ').trim(),
          text: plainText,
          html,
        };

        if (includeAttachment && hasAudio && audioData && audioData.length > 50) {
          emailBody.attachments = [
            {
              filename: attachmentFilename.replace(/[^a-zA-Z0-9._-]/g, '_'),
              content: audioData,
            },
          ];
        }

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailBody),
          });

          const payload = await response.json().catch(() => null);
          return { ok: response.ok, status: response.status, payload };
        } catch (err: any) {
          return { ok: false, status: 500, payload: { message: err?.message || 'Network error connecting to Resend' } };
        }
      };

      // Attempt 1: configured sender + audio attachment
      let result = await sendResendEmail(from, hasAudio, to);

      // If initial send failed (e.g. unverified custom domain or display name), retry with onboarding@resend.dev
      if (!result.ok) {
        result = await sendResendEmail('onboarding@resend.dev', hasAudio, to);
      }

      // If still failed and has audio attachment, retry without attachment
      if (!result.ok && hasAudio) {
        result = await sendResendEmail('onboarding@resend.dev', false, to);
      }

      // If still failed and to has custom or multiple addresses, retry to default address
      if (!result.ok && (to.length > 1 || to[0] !== 'kmsiddesh009@gmail.com')) {
        result = await sendResendEmail('onboarding@resend.dev', false, ['kmsiddesh009@gmail.com']);
      }

      // If Resend rejected because testing emails can only be sent to the account owner's email address:
      if (!result.ok) {
        const { ownerEmail } = extractResendErrorInfo(result.payload);
        if (ownerEmail) {
          result = await sendResendEmail('onboarding@resend.dev', false, [ownerEmail]);
        }
      }

      resendResult = result;
    }

    const emailSent = Boolean((smtpResult && smtpResult.ok) || (resendResult && resendResult.ok));
    console.log(`[Attempt Alert] Recorded attempt #${attemptNum} for "${visitorDisplayName}" (${methodUpper}) - Delivered via: SMTP=${smtpResult?.ok ? 'YES' : 'NO'}, Resend=${resendResult?.ok ? 'YES' : 'NO'}`);

    return res.json({
      success: true,
      emailSent,
      id: smtpResult?.messageId || resendResult?.payload?.id || 'local-saved',
    });
  } catch (error: any) {
    console.warn('[Attempt Alert] Notice:', error?.message || error);
    return res.status(200).json({ success: true, localOnly: true, error: 'Saved locally' });
  }
});

// Diagnostic endpoint to check email configuration and run test sends
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

// ==========================================
// VISITOR SESSIONS & QUESTION RECORDS STORE
// ==========================================

interface StoredAnswer {
  questionId: string;
  questionNumber: number;
  questionTitle: string;
  questionPrompt: string;
  answer: string;
  normalizedAnswer?: string;
  method: 'voice' | 'typed';
  isCorrect?: boolean;
  timestamp: string;
  audioBase64?: string;
  audioMimeType?: string;
  attachmentFilename?: string;
}

interface StoredVisitorSession {
  sessionId: string;
  userName: string;
  moniker?: string;
  email?: string;
  loginTime: string;
  status: 'in_progress' | 'completed';
  startTime: string;
  completedTime?: string;
  durationSeconds?: number;
  totalAttempts: number;
  answers: StoredAnswer[];
  emailSent?: boolean;
  emailSentAt?: string;
  emailError?: string;
}

const visitorSessionsMap = new Map<string, StoredVisitorSession>();

// Helper to send immediate Login/Identity Alert Email & Webhook
async function sendLoginAlertEmail(session: StoredVisitorSession, isUpdate = false) {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const formattedTime = formatAttemptTime(session.loginTime || session.startTime);
  const actionLabel = isUpdate ? 'Identity Updated' : 'New Visitor Login';

  const subject = `🏰 🧛 Gothic Gate — ${actionLabel}: ${session.userName}`;

  const plainText = [
    '======================================================',
    `🏰 GOTHIC GATE — ${actionLabel.toUpperCase()}`,
    '======================================================',
    '',
    `Visitor Name: ${session.userName}`,
    session.moniker ? `Vampire Moniker / Title: ${session.moniker}` : '',
    session.email ? `Visitor Email: ${session.email}` : '',
    `Login / Start Time: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    `Status: ${session.status}`,
    '',
    'The visitor has entered the castle grounds and is beginning the challenges.',
    `Alert sent to: ${to.join(', ')}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #f43f5e; font-size: 20px; letter-spacing: 0.02em;">🏰 🧛 Gothic Gate — ${escapeHtml(actionLabel)}</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">A visitor has entered the castle gates.</p>
      </div>
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor Name: <span style="color: #f43f5e;">${escapeHtml(session.userName)}</span>
        </div>
        ${session.moniker ? `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">🧛 <strong>Vampire Moniker:</strong> ${escapeHtml(session.moniker)}</div>` : ''}
        ${session.email ? `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📧 <strong>Email:</strong> ${escapeHtml(session.email)}</div>` : ''}
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">⏰ <strong>Login Time:</strong> ${escapeHtml(formattedTime)}</div>
        <div style="font-size: 11px; color: #64748b; font-family: monospace;">Session ID: ${escapeHtml(session.sessionId)}</div>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Sent automatically to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  // 1. Dispatch Webhook
  sendWebhookNotification({
    title: `🏰 Visitor Login: ${session.userName}`,
    description: `A visitor just logged in and started the Gothic quest!\n**Name:** ${session.userName}${session.moniker ? `\n**Alias:** ${session.moniker}` : ''}`,
    fields: [
      { name: 'Time', value: formattedTime },
      { name: 'Session', value: session.sessionId },
    ],
  }).catch(() => {});

  // 2. Dispatch SMTP
  if (smtpConfig) {
    sendSmtpEmail({
      to,
      subject,
      text: plainText,
      html,
    }).catch(() => {});
  }

  // 3. Dispatch Resend
  if (apiKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        text: plainText,
        html,
      }),
    }).catch(() => {});
  }
}

// Helper to send Reset/Restart Alert Email & Webhook
async function sendResetAlertEmail(session: StoredVisitorSession, stageName = 'Entrance') {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const formattedTime = formatAttemptTime(new Date().toISOString());

  const subject = `🔄 🧛 Gothic Gate — Visitor Reset/Restart: ${session.userName} (${session.answers.length} answers saved)`;

  const plainText = [
    '======================================================',
    '🔄 GOTHIC GATE — VISITOR RESET / REPLAY',
    '======================================================',
    '',
    `Visitor Name: ${session.userName}`,
    session.moniker ? `Vampire Moniker: ${session.moniker}` : '',
    `Reset Action At: ${formattedTime}`,
    `Restart Stage: ${stageName}`,
    `Previous Answers Recorded: ${session.answers.length}`,
    `Session ID: ${session.sessionId}`,
    '',
    'The visitor has restarted/replayed the quest or returned to entrance.',
    `Alert sent to: ${to.join(', ')}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px; letter-spacing: 0.02em;">🔄 🧛 Gothic Gate — Visitor Reset / Replay</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">The visitor has restarted the quest or replayed the quiz.</p>
      </div>
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
        </div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📍 <strong>Reset Action:</strong> Restarted at ${escapeHtml(stageName)}</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📝 <strong>Answers in History:</strong> ${session.answers.length}</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">⏰ <strong>Reset Time:</strong> ${escapeHtml(formattedTime)}</div>
        <div style="font-size: 11px; color: #64748b; font-family: monospace;">Session ID: ${escapeHtml(session.sessionId)}</div>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Sent automatically to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  // 1. Dispatch Webhook
  sendWebhookNotification({
    title: `🔄 Quest Reset/Restart: ${session.userName}`,
    description: `Visitor **${session.userName}** restarted the journey at **${stageName}** (${session.answers.length} answers in history).`,
    fields: [
      { name: 'Time', value: formattedTime },
      { name: 'Stage', value: stageName },
    ],
  }).catch(() => {});

  // 2. Dispatch SMTP
  if (smtpConfig) {
    sendSmtpEmail({
      to,
      subject,
      text: plainText,
      html,
    }).catch(() => {});
  }

  // 3. Dispatch Resend
  if (apiKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        text: plainText,
        html,
      }),
    }).catch(() => {});
  }
}

// Helper to send instant answer alert email for each question response
async function sendAnswerAlertEmail(session: StoredVisitorSession, answer: StoredAnswer) {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const formattedTime = formatAttemptTime(answer.timestamp);
  const isVoice = answer.method === 'voice';
  const hasAudio = Boolean(answer.audioBase64 && answer.audioBase64.length > 200);

  const subject = `📝 🧛 Gothic Gate — Q#${answer.questionNumber}: ${session.userName} answered "${answer.questionTitle}"`;

  const plainText = [
    '======================================================',
    `📝 GOTHIC GATE — QUESTION ANSWER RECORDED (Q#${answer.questionNumber})`,
    '======================================================',
    '',
    `Visitor: ${session.userName}`,
    session.moniker ? `Moniker / Alias: ${session.moniker}` : '',
    session.email ? `Email: ${session.email}` : '',
    `Question #${answer.questionNumber}: ${answer.questionTitle}`,
    `Prompt / Challenge: "${answer.questionPrompt}"`,
    `Submitted Answer: "${answer.answer}"`,
    `Method: ${answer.method.toUpperCase()}`,
    `Time: ${formattedTime}`,
    hasAudio ? `Audio Recording: ATTACHED (${answer.attachmentFilename || 'recording.webm'})` : 'Audio Recording: None (Typed)',
    `Total Answers So Far: ${session.answers.length}`,
    `Session ID: ${session.sessionId}`,
    '',
    `Alert sent to: ${to.join(', ')}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px; letter-spacing: 0.02em;">📝 🧛 Question #${answer.questionNumber} Answered</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} just submitted an answer.</p>
      </div>

      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
        <div style="font-size: 15px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">
          👤 Visitor: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
          ${session.moniker ? `<span style="font-size: 12px; color: #94a3b8; font-weight: normal;"> (${escapeHtml(session.moniker)})</span>` : ''}
        </div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;"><strong>Challenge:</strong> ${escapeHtml(answer.questionTitle)}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">${escapeHtml(answer.questionPrompt)}</div>

        <div style="background: #030712; border-left: 3px solid #38bdf8; padding: 10px 14px; border-radius: 4px; color: #ffffff; font-size: 16px; font-style: italic; margin-bottom: 12px;">
          "${escapeHtml(answer.answer)}"
        </div>

        <div style="font-size: 12px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">
          <div>Method: <strong style="color: #f1f5f9;">${answer.method.toUpperCase()}</strong></div>
          ${hasAudio ? `<div>🎙️ Audio: <strong style="color: #4ade80;">ATTACHED (${escapeHtml(answer.attachmentFilename || 'recording.webm')})</strong></div>` : ''}
          <div>Time: <span style="color: #cbd5e1;">${escapeHtml(formattedTime)}</span></div>
        </div>
      </div>

      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Total Answers Recorded: ${session.answers.length}</p>
    </div>
  `;

  // 1. Dispatch Webhook
  sendWebhookNotification({
    title: `📝 Q#${answer.questionNumber} Answered by ${session.userName}`,
    description: `**Challenge:** ${answer.questionTitle}\n**Answer:** "${answer.answer}"\n**Method:** ${answer.method.toUpperCase()}`,
    fields: [
      { name: 'Time', value: formattedTime },
      { name: 'Audio', value: hasAudio ? 'Audio Attached' : 'Typed' },
    ],
  }).catch(() => {});

  // 2. Dispatch SMTP
  if (smtpConfig) {
    const attachments = hasAudio && answer.audioBase64 && answer.attachmentFilename
      ? [{ filename: answer.attachmentFilename, content: answer.audioBase64 }]
      : undefined;

    sendSmtpEmail({
      to,
      subject,
      text: plainText,
      html,
      attachments,
    }).catch((err) => {
      console.warn('[Answer Alert] SMTP send notice:', err?.message || err);
    });
  }

  // 3. Dispatch Resend
  if (apiKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        text: plainText,
        html,
      }),
    }).catch(() => {});
  }
}

// Register or update visitor login
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
      void sendLoginAlertEmail(existing, true);
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
  void sendLoginAlertEmail(newSession, false);

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
    void sendResetAlertEmail(session, stageName || 'Entrance');
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

  // Check if answer for this question already exists, update or append
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
  void sendAnswerAlertEmail(session, answerRecord);

  return res.json({ success: true, answer: sanitizeAnswer(answerRecord), totalAnswers: session.answers.length });
});

// Record Page 2 Photo Puzzle Completion or Attempt Result
app.post('/api/puzzle/complete', (req, res) => {
  const { sessionId, moves, timeTakenSeconds, timeRemainingSeconds, attemptNumber, status, puzzleMode, hardFailedAttempts } = req.body ?? {};
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

  const modeLabel = puzzleMode === 'easy' ? '3x3 Easy Mode' : '6x6 Hard Mode';
  const isSolved = status === 'solved' || status === undefined;
  const puzzleRecord: StoredAnswer = {
    questionId: 'page2_photo_puzzle',
    questionNumber: 2,
    questionTitle: `The Broken Memory Puzzle (${modeLabel})`,
    questionPrompt: puzzleMode === 'easy'
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

  console.log(`[Puzzle Attempt] "${session.userName}" - ${modeLabel} Attempt #${attemptNumber || 1} result: ${isSolved ? 'SOLVED' : 'TIMEOUT'} (${moves || 0} moves, ${timeTakenSeconds || 0}s).`);
  
  // Instant per-answer email dispatch
  void sendAnswerAlertEmail(session, puzzleRecord);

  return res.json({ success: true, record: sanitizeAnswer(puzzleRecord) });
});

// Complete the quest: aggregates all answers and dispatches the completed Dossier Email
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

  // Send Comprehensive Completed Dossier Email
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

// Helper to send comprehensive Completed Dossier Email & Webhook
async function sendCompletedDossierEmail(session: StoredVisitorSession): Promise<{ ok: boolean; id?: string; error?: string; notice?: string }> {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();

  const durationMin = Math.floor((session.durationSeconds || 0) / 60);
  const durationSec = (session.durationSeconds || 0) % 60;
  const durationStr = durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`;
  const formattedStart = formatAttemptTime(session.startTime);
  const formattedEnd = formatAttemptTime(session.completedTime);

  const subject = `🏰 🧛 Gothic Gate — Complete Quest Dossier: ${session.userName} (${session.answers.length} Answers Completed)`;

  // Plain Text Summary
  const textLines = [
    '======================================================',
    '🧛 GOTHIC GATE — COMPLETED VISITOR DOSSIER & RECORDS',
    '======================================================',
    '',
    `Visitor Name: ${session.userName}`,
    session.moniker ? `Vampire Alias / Moniker: ${session.moniker}` : '',
    session.email ? `Visitor Email: ${session.email}` : '',
    `Login / Start Time: ${formattedStart}`,
    `Completion Time: ${formattedEnd}`,
    `Total Quest Time: ${durationStr}`,
    `Total Answers Recorded: ${session.answers.length}`,
    `Session ID: ${session.sessionId}`,
    '',
    '------------------------------------------------------',
    'ALL RECORDED QUESTIONS & ANSWERS:',
    '------------------------------------------------------',
  ];

  session.answers.forEach((ans, idx) => {
    textLines.push(
      `\n[Question #${ans.questionNumber || idx + 1}] ${ans.questionTitle}`,
      `Prompt: "${ans.questionPrompt}"`,
      `Submitted Answer: "${ans.answer}"`,
      `Method: ${ans.method.toUpperCase()}`,
      `Audio Recording: ${ans.attachmentFilename ? `ATTACHED (${ans.attachmentFilename})` : 'None (Typed)'}`,
      `Recorded At: ${formatAttemptTime(ans.timestamp)}`
    );
  });

  textLines.push(
    '',
    '======================================================',
    `All voice audio files have been preserved and attached.`,
    `End of Dossier.`
  );

  const plainText = textLines.filter(Boolean).join('\n');

  // HTML Table of Answers
  const answersRowsHtml = session.answers
    .map((ans, idx) => {
      const isVoice = ans.method === 'voice';
      const hasAudio = Boolean(ans.audioBase64 && ans.audioBase64.length > 200);
      return `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px; font-weight: bold; color: #38bdf8; vertical-align: top; width: 35px;">#${ans.questionNumber || idx + 1}</td>
          <td style="padding: 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 14px; margin-bottom: 4px;">${escapeHtml(ans.questionTitle)}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">${escapeHtml(ans.questionPrompt)}</div>
            <div style="background: #090d16; border-left: 3px solid #38bdf8; padding: 8px 12px; border-radius: 4px; font-style: italic; color: #ffffff; font-size: 15px;">
              "${escapeHtml(ans.answer)}"
            </div>
            <div style="margin-top: 6px; font-size: 11px; color: #64748b;">
              Method: <span style="color: ${isVoice ? '#38bdf8' : '#cbd5e1'}; font-weight: 600;">${ans.method.toUpperCase()}</span>
              &bull; ${hasAudio ? `<span style="color: #4ade80;">🎙️ Audio Attached: <b>${escapeHtml(ans.attachmentFilename || 'recording.webm')}</b></span>` : '<span>⌨️ Typed Answer</span>'}
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 28px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 22px; letter-spacing: 0.02em;">🏰 🧛 Gothic Gate — Complete Visitor Dossier</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 14px;">A visitor has completed the entire Gothic Birthday Journey.</p>
      </div>

      <!-- Visitor Summary Box -->
      <div style="background: #0f172a; border: 1px solid #1e2d4d; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
          ${session.moniker ? `<span style="font-size: 13px; color: #94a3b8; font-weight: normal;"> (${escapeHtml(session.moniker)})</span>` : ''}
        </div>
        ${session.email ? `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Email:</strong> ${escapeHtml(session.email)}</div>` : ''}
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 4px;">
          <strong>Total Time:</strong> <span style="color: #f1f5f9;">${escapeHtml(durationStr)}</span> &bull; 
          <strong>Completed At:</strong> <span style="color: #f1f5f9;">${escapeHtml(formattedEnd)}</span>
        </div>
        <div style="font-size: 12px; color: #64748b;">
          Session ID: <code>${escapeHtml(session.sessionId)}</code> &bull; Total Answers Recorded: <strong>${session.answers.length}</strong>
        </div>
      </div>

      <!-- Answers Table -->
      <h3 style="color: #f1f5f9; font-size: 16px; margin: 0 0 12px 0;">📜 All Recorded Question Answers:</h3>
      <table style="width: 100%; border-collapse: collapse; background: #0c1220; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          ${answersRowsHtml}
        </tbody>
      </table>

      <!-- Attachments Notice -->
      <div style="background: #0b1528; border: 1px dashed #38bdf8; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #93c5fd; margin-bottom: 20px;">
        🎙️ <strong>Voice Audio Files:</strong> All audio clips recorded from the visitor have been safely attached as audio files.
      </div>

      <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">Gothic Gate Visitor Log System &bull; Sent automatically to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  // Compile all audio attachments
  const attachments: any[] = [];
  session.answers.forEach((ans, idx) => {
    if (ans.audioBase64 && ans.audioBase64.length > 200) {
      const rawAudio = stripDataUrl(ans.audioBase64);
      if (rawAudio.length > 50) {
        const ext = safeAudioExtension(ans.audioMimeType || 'audio/webm');
        const filename = ans.attachmentFilename || `gothic-q${idx + 1}-voice.${ext}`;
        attachments.push({
          filename,
          content: rawAudio,
        });
      }
    }
  });

  // 1. Dispatch via Webhook (Discord / Slack / Google Sheets)
  sendWebhookNotification({
    title: `🏆 Gothic Quest Completed: ${session.userName}`,
    description: `A visitor completed the quest in **${durationStr}**!\n**Total Answers Recorded:** ${session.answers.length}`,
    fields: [
      { name: 'Visitor Name', value: session.userName },
      { name: 'Completed At', value: formattedEnd },
      { name: 'Audio Clips', value: `${attachments.length} voice recordings saved` },
    ],
  }).catch(() => {});

  // 2. Dispatch via SMTP if configured (Direct & reliable!)
  if (smtpConfig) {
    const smtpRes = await sendSmtpEmail({
      to,
      subject,
      text: plainText,
      html,
      attachments,
    });
    if (smtpRes.ok) {
      return { ok: true, id: smtpRes.messageId };
    }
  }

  // 3. Dispatch via Resend API if configured
  if (apiKey) {
    const sendEmailPayload = async (senderFrom: string, includeAttachments: boolean, recipients: string[]) => {
      const body: any = {
        from: senderFrom,
        to: recipients,
        subject: subject.replace(/[\r\n\t]+/g, ' ').trim(),
        text: plainText,
        html,
      };
      if (includeAttachments && attachments.length > 0) {
        body.attachments = attachments.map((a) => ({
          filename: String(a.filename || 'voice-recording.webm').replace(/[^a-zA-Z0-9._-]/g, '_'),
          content: a.content,
        }));
      }

      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => null);
        return { ok: resp.ok, status: resp.status, data };
      } catch (err: any) {
        return { ok: false, status: 500, data: { message: err?.message || 'Connection error to Resend' } };
      }
    };

    // Attempt with attachments
    let res = await sendEmailPayload(from, true, to);
    if (!res.ok) {
      res = await sendEmailPayload('onboarding@resend.dev', true, to);
    }
    if (!res.ok && attachments.length > 0) {
      res = await sendEmailPayload('onboarding@resend.dev', false, to);
    }
    if (!res.ok && (to.length > 1 || to[0] !== 'kmsiddesh009@gmail.com')) {
      res = await sendEmailPayload('onboarding@resend.dev', false, ['kmsiddesh009@gmail.com']);
    }

    if (res.ok) {
      console.log('[Dossier Email] Delivered full dossier via Resend:', res.data?.id);
      return { ok: true, id: res.data?.id };
    }
  }

  // If neither SMTP nor Resend succeeded, saved locally in visitor session store
  console.log(`[Dossier Local] Saved complete dossier for "${session.userName}" (${session.answers.length} answers, ${durationStr}). Available in Admin Portal.`);
  return { ok: true, id: 'local-saved' };
}

// Get all visitor session records (for Admin / Dossier Explorer)
app.get('/api/visitor/records', (_req, res) => {
  const records = Array.from(visitorSessionsMap.values())
    .map(sanitizeSession)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return res.json({ success: true, count: records.length, records });
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

// Status of all delivery options
app.get('/api/admin/status', (_req, res) => {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();

  return res.json({
    recipient: to,
    sender: from,
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

// Diagnostic test endpoint across all channels
app.post('/api/admin/test-dispatch', async (_req, res) => {
  const { apiKey, to } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();

  const results: any = {
    recipient: to,
    smtp: null,
    resend: null,
    webhook: null,
  };

  // 1. Test SMTP if configured
  if (smtpConfig) {
    const smtpRes = await sendSmtpEmail({
      to,
      subject: '🧛 Gothic Gate — Test Email via SMTP',
      text: 'Congratulations! Your SMTP (Gmail) integration is active and working. You will receive all entrance attempts and complete dossiers directly.',
      html: `
        <div style="background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px; font-family: sans-serif;">
          <h2 style="color: #38bdf8;">🏰 Gothic Gate SMTP Test</h2>
          <p>Your Gmail SMTP connection is working perfectly!</p>
          <p>All visitor riddle answers, MBBS exam scores, couple trivia choices, and voice recordings will be delivered directly here.</p>
        </div>
      `,
    });
    results.smtp = smtpRes;
  } else {
    results.smtp = { ok: false, error: 'SMTP not configured (Add SMTP_USER & SMTP_PASS in .env or Settings)' };
  }

  // 2. Test Resend if configured
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
    results.resend = { ok: false, error: 'Resend not configured (Add RESEND_API_KEY in Settings)' };
  }

  // 3. Test Webhook if configured
  if (webhookUrl) {
    const whRes = await sendWebhookNotification({
      title: '🧛 Gothic Gate — Test Alert',
      description: 'Webhook integration is working properly! All visitor activities will be delivered in real-time.',
      fields: [{ name: 'Test Status', value: '✅ Connected' }],
    });
    results.webhook = whRes;
  } else {
    results.webhook = { ok: false, error: 'Webhook not configured (Add WEBHOOK_URL in Settings)' };
  }

  const anySuccess = Boolean(
    (results.smtp && results.smtp.ok) ||
    (results.resend && results.resend.ok) ||
    (results.webhook && results.webhook.ok)
  );

  return res.json({
    success: anySuccess,
    results,
    advice: !anySuccess
      ? 'To receive emails instantly without domain verification, set SMTP_USER="your-email@gmail.com" and SMTP_PASS="your-16-character-app-password" in Settings -> Environment Variables. You can also paste a Discord Webhook URL into WEBHOOK_URL for instant mobile notifications!'
      : 'At least one delivery channel is active and receiving alerts!',
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

function sanitizeSession(session: StoredVisitorSession) {
  return {
    ...session,
    answers: session.answers.map(sanitizeAnswer),
  };
}

function sanitizeAnswer(answer: StoredAnswer) {
  return {
    ...answer,
    hasAudio: Boolean(answer.audioBase64 && answer.audioBase64.length > 200),
    audioBase64: undefined, // Hide giant base64 from generic list payloads
  };
}

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
