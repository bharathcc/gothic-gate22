import nodemailer from 'nodemailer';

export interface StoredAnswer {
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

export interface StoredVisitorSession {
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

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 string
}

export interface UniversalEmailOptions {
  subject: string;
  plainText: string;
  html: string;
  attachments?: EmailAttachment[];
  webhookTitle?: string;
  webhookDesc?: string;
  webhookFields?: Array<{ name: string; value: string }>;
}

export function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function stripDataUrl(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const comma = value.indexOf('base64,');
  const raw = comma >= 0 ? value.slice(comma + 'base64,'.length) : value;
  const cleaned = raw.replace(/[^A-Za-z0-9+/=]/g, '').trim();
  if (!cleaned || cleaned.length < 50) return '';
  const pad = cleaned.length % 4;
  return pad === 0 ? cleaned : cleaned + '='.repeat(4 - pad);
}

export function formatAttemptTime(isoString?: string): string {
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

export interface RuntimeEmailConfig {
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
  resendApiKey?: string;
  alertEmailTo?: string;
  webhookUrl?: string;
  enableNtfy?: boolean;
}

let runtimeConfig: RuntimeEmailConfig = {
  enableNtfy: true,
};

export function setRuntimeConfig(config: Partial<RuntimeEmailConfig>) {
  runtimeConfig = { ...runtimeConfig, ...config };
}

export function getRuntimeConfig(): RuntimeEmailConfig {
  return runtimeConfig;
}

export function getAlertConfig() {
  const rawKey = runtimeConfig.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim() || '';
  const isPlaceholder = rawKey === 'MY_RESEND_API_KEY' || rawKey === 'RESEND_API_KEY' || rawKey === 're_your_api_key_here';
  const apiKey = isPlaceholder ? '' : rawKey;

  const rawTo = runtimeConfig.alertEmailTo?.trim() || process.env.ALERT_EMAIL_TO?.trim() || 'kmsiddesh009@gmail.com';
  const recipients = rawTo
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && s.includes('@'));

  const to = recipients.length > 0 ? recipients : ['kmsiddesh009@gmail.com'];
  const from = process.env.ALERT_EMAIL_FROM?.trim() || 'Gothic Gatekeeper <onboarding@resend.dev>';

  return { apiKey, to, from };
}

export function getSMTPConfig() {
  const user = runtimeConfig.smtpUser?.trim() || process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim() || '';
  const pass = runtimeConfig.smtpPass?.trim() || process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASS?.trim() || '';
  const host = runtimeConfig.smtpHost?.trim() || process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = runtimeConfig.smtpPort || parseInt(process.env.SMTP_PORT?.trim() || '465', 10);
  const secure = port === 465;

  if (!user || !pass || user.length < 5 || pass.length < 4) {
    return null;
  }
  return { user, pass, host, port, secure };
}

export function getWebhookUrl(): string | null {
  const url = runtimeConfig.webhookUrl?.trim() || process.env.WEBHOOK_URL?.trim() || process.env.DISCORD_WEBHOOK_URL?.trim() || '';
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  return null;
}

export const NTFY_TOPIC = 'gothic-gate-dracula-kmsiddesh009';

/**
 * Sends instant zero-configuration notification + email forward via ntfy.sh
 * Users can also open https://ntfy.sh/gothic-gate-dracula-kmsiddesh009 in any browser or app.
 */
export async function sendNtfyNotification(payload: {
  title: string;
  message: string;
  tags?: string[];
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  forwardEmail?: string;
}): Promise<{ ok: boolean; status?: number }> {
  try {
    const { to } = getAlertConfig();
    const emailToForward = payload.forwardEmail || (to.length > 0 ? to[0] : 'kmsiddesh009@gmail.com');

    const headers: Record<string, string> = {
      Title: payload.title.slice(0, 100),
      Priority: payload.priority || 'high',
      Tags: (payload.tags && payload.tags.length > 0 ? payload.tags : ['vampire', 'memo']).join(','),
      'X-Email': emailToForward,
    };

    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers,
      body: payload.message.slice(0, 4000),
    });

    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

export async function sendWebhookNotification(payload: {
  title: string;
  description: string;
  fields?: Array<{ name: string; value: string }>;
  color?: number;
}): Promise<{ ok: boolean; status?: number }> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return { ok: false };

  try {
    const isDiscord = webhookUrl.includes('discord.com');
    let body: any;

    if (isDiscord) {
      body = {
        username: '🧛 Gothic Castle Gatekeeper',
        avatar_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=128&q=80',
        embeds: [
          {
            title: payload.title,
            description: payload.description,
            color: payload.color ?? 0xe11d48,
            timestamp: new Date().toISOString(),
            fields: payload.fields?.map((f) => ({ name: f.name, value: f.value, inline: true })),
            footer: { text: 'Gothic Quest Dossier System' },
          },
        ],
      };
    } else {
      body = {
        title: payload.title,
        text: payload.description,
        fields: payload.fields,
        timestamp: new Date().toISOString(),
      };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (err: any) {
    return { ok: false };
  }
}

export async function sendSmtpEmail(options: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const config = getSMTPConfig();
  if (!config) {
    return { ok: false, error: 'SMTP credentials not configured.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const mailOptions: any = {
      from: `"Gothic Gatekeeper" <${config.user}>`,
      to: options.to.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'SMTP error' };
  }
}

export function extractResendErrorInfo(payload: any): { message?: string; name?: string; ownerEmail?: string } {
  if (!payload || typeof payload !== 'object') return {};
  const message = payload.message || payload.error?.message || payload.error;
  const name = payload.name || payload.error?.name;
  let ownerEmail: string | undefined;

  if (typeof message === 'string') {
    const match = message.match(/testing emails to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (match && match[1]) {
      ownerEmail = match[1];
    }
  }
  return { message, name, ownerEmail };
}

  // Universal Robust Dispatcher: Tries SMTP -> Resend (with full retries/fallbacks) -> Webhook -> ntfy.sh (Zero-config instant cloud push + email)
export async function sendUniversalEmailAlert(options: UniversalEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { apiKey, to, from } = getAlertConfig();
  const smtpConfig = getSMTPConfig();
  const webhookUrl = getWebhookUrl();
  const runtime = getRuntimeConfig();

  let smtpOk = false;
  let resendOk = false;
  let ntfyOk = false;
  let deliveredId = '';

  // 1. Webhook
  if (webhookUrl) {
    sendWebhookNotification({
      title: options.webhookTitle || options.subject,
      description: options.webhookDesc || options.plainText.slice(0, 1000),
      fields: options.webhookFields,
    }).catch(() => {});
  }

  // 2. ntfy.sh (Instant Zero-Config Cloud Push & Email Gateway)
  if (runtime.enableNtfy !== false) {
    try {
      const ntfyRes = await sendNtfyNotification({
        title: options.webhookTitle || options.subject,
        message: options.plainText,
        tags: ['vampire', 'tada', 'trophy'],
        priority: 'high',
        forwardEmail: to[0] || 'kmsiddesh009@gmail.com',
      });
      if (ntfyRes.ok) {
        ntfyOk = true;
        deliveredId = deliveredId || 'ntfy-delivered';
        console.log(`[Alert Dispatched] ntfy.sh cloud notification + email forward: "${options.subject}"`);
      }
    } catch {
      // Ignore ntfy errors
    }
  }

  // 3. SMTP (Direct & 100% reliable without domain verification restrictions)
  if (smtpConfig) {
    try {
      const smtpRes = await sendSmtpEmail({
        to,
        subject: options.subject,
        text: options.plainText,
        html: options.html,
        attachments: options.attachments,
      });
      if (smtpRes.ok) {
        smtpOk = true;
        deliveredId = smtpRes.messageId || 'smtp-delivered';
        console.log(`[Alert Dispatched] SMTP to ${to.join(', ')}: "${options.subject}"`);
      }
    } catch (err: any) {
      console.warn(`[Alert Notice] SMTP error:`, err?.message || err);
    }
  }

  // 4. Resend API
  if (apiKey) {
    const hasAttachments = Boolean(options.attachments && options.attachments.length > 0);

    const sendViaResend = async (sender: string, includeAttachments: boolean, recipients: string[]) => {
      const body: any = {
        from: sender,
        to: recipients,
        subject: options.subject.replace(/[\r\n\t]+/g, ' ').trim(),
        text: options.plainText,
        html: options.html,
      };

      if (includeAttachments && options.attachments && options.attachments.length > 0) {
        body.attachments = options.attachments.map((a) => ({
          filename: String(a.filename || 'audio.webm').replace(/[^a-zA-Z0-9._-]/g, '_'),
          content: a.content,
        }));
      }

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => null);
        return { ok: response.ok, status: response.status, payload };
      } catch (err: any) {
        return { ok: false, status: 500, payload: { message: err?.message || 'Network error connecting to Resend' } };
      }
    };

    try {
      // 1. Try configured sender with attachments
      let res = await sendViaResend(from, hasAttachments, to);

      // 2. Try onboarding@resend.dev with attachments
      if (!res.ok) {
        res = await sendViaResend('onboarding@resend.dev', hasAttachments, to);
      }

      // 3. Try without attachments if payload rejected
      if (!res.ok && hasAttachments) {
        res = await sendViaResend('onboarding@resend.dev', false, to);
      }

      // 4. Try default target kmsiddesh009@gmail.com
      if (!res.ok && (to.length > 1 || to[0] !== 'kmsiddesh009@gmail.com')) {
        res = await sendViaResend('onboarding@resend.dev', false, ['kmsiddesh009@gmail.com']);
      }

      // 5. Account owner email fallback
      if (!res.ok) {
        const { ownerEmail } = extractResendErrorInfo(res.payload);
        if (ownerEmail) {
          res = await sendViaResend('onboarding@resend.dev', false, [ownerEmail]);
        }
      }

      if (res.ok) {
        resendOk = true;
        deliveredId = res.payload?.id || deliveredId || 'resend-delivered';
        console.log(`[Alert Dispatched] Resend (ID: ${deliveredId}): "${options.subject}"`);
      }
    } catch (err: any) {
      console.warn(`[Alert Notice] Resend error:`, err?.message || err);
    }
  }

  return {
    ok: smtpOk || resendOk || ntfyOk,
    id: deliveredId || 'local-saved',
  };
}

// =========================================================================
// DEDICATED STAGE NOTIFICATION BUILDERS
// =========================================================================

// 1. Login Alert Email
export async function sendLoginAlertEmail(session: StoredVisitorSession, isUpdate = false) {
  const { to } = getAlertConfig();
  const formattedTime = formatAttemptTime(session.loginTime || session.startTime);
  const actionLabel = isUpdate ? 'Identity Updated' : 'New Visitor Login';

  const subject = `🏰 🧛 Gothic Gate — ${actionLabel}: ${session.userName}`;

  const plainText = [
    '======================================================',
    `🏰 GOTHIC GATE — ${actionLabel.toUpperCase()}`,
    '======================================================',
    '',
    `Visitor Name: ${session.userName}`,
    session.moniker ? `Vampire Moniker: ${session.moniker}` : '',
    session.email ? `Visitor Email: ${session.email}` : '',
    `Login / Start Time: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    `Status: ${session.status}`,
    '',
    'A visitor has entered the castle gates and is beginning the challenges.',
    `Alert sent to: ${to.join(', ')}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #f43f5e; font-size: 20px;">🏰 🧛 Gothic Gate — ${escapeHtml(actionLabel)}</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">A visitor has entered the castle gates.</p>
      </div>
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor Name: <span style="color: #f43f5e;">${escapeHtml(session.userName)}</span>
        </div>
        ${session.moniker ? `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">🧛 <strong>Moniker:</strong> ${escapeHtml(session.moniker)}</div>` : ''}
        ${session.email ? `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📧 <strong>Email:</strong> ${escapeHtml(session.email)}</div>` : ''}
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">⏰ <strong>Login Time:</strong> ${escapeHtml(formattedTime)}</div>
        <div style="font-size: 11px; color: #64748b; font-family: monospace;">Session ID: ${escapeHtml(session.sessionId)}</div>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `🏰 Visitor Login: ${session.userName}`,
    webhookDesc: `A visitor just entered the Gothic quest: **${session.userName}**`,
    webhookFields: [{ name: 'Login Time', value: formattedTime }],
  });
}

// 2. Chapter II Photo Puzzle Solved Email
export async function sendPuzzleCompleteEmail(session: StoredVisitorSession, details: {
  moves: number;
  timeTakenSeconds: number;
  timeRemainingSeconds: number;
  puzzleMode: 'easy' | 'hard';
  attemptNumber: number;
  isSolved: boolean;
}) {
  const { to } = getAlertConfig();
  const formattedTime = formatAttemptTime(new Date().toISOString());
  const modeLabel = details.puzzleMode === 'easy' ? '3x3 Easy Mode' : '6x6 Hard Mode';
  const statusStr = details.isSolved ? 'SOLVED & RESTORED' : 'TIMED OUT';
  const icon = details.isSolved ? '🧩 ✅' : '🧩 ⏱️';

  const subject = `${icon} 🧛 Gothic Gate — Chapter II Puzzle ${statusStr}: ${session.userName} (${modeLabel})`;

  const plainText = [
    '======================================================',
    `🧩 GOTHIC GATE — CHAPTER II PHOTO PUZZLE: ${statusStr}`,
    '======================================================',
    '',
    `Visitor: ${session.userName}`,
    `Puzzle Mode: ${modeLabel}`,
    `Status: ${statusStr}`,
    `Moves Count: ${details.moves}`,
    `Time Taken: ${details.timeTakenSeconds}s (Time Remaining: ${details.timeRemainingSeconds}s)`,
    `Attempt Number: #${details.attemptNumber}`,
    `Time Recorded: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    '',
    `Alert sent to: ${to.join(', ')}`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px;">🧩 🧛 Chapter II — The Broken Memory Puzzle</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} just ${details.isSolved ? 'restored the sacred memory photograph' : 'completed a puzzle attempt'}.</p>
      </div>
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
        </div>
        <div style="font-size: 14px; color: ${details.isSolved ? '#4ade80' : '#f87171'}; font-weight: bold; margin-bottom: 8px;">
          ${details.isSolved ? '✅ Puzzle Successfully Solved!' : '⏱️ Time Expired'}
        </div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">🎮 <strong>Difficulty:</strong> ${modeLabel}</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">🔄 <strong>Moves Made:</strong> ${details.moves}</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">⏳ <strong>Time:</strong> ${details.timeTakenSeconds}s (${details.timeRemainingSeconds}s left)</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">🔢 <strong>Attempt:</strong> #${details.attemptNumber}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px; font-family: monospace;">Time: ${escapeHtml(formattedTime)}</div>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `🧩 Chapter II Puzzle ${statusStr}: ${session.userName}`,
    webhookDesc: `**Visitor:** ${session.userName}\n**Mode:** ${modeLabel}\n**Moves:** ${details.moves}\n**Time:** ${details.timeTakenSeconds}s`,
  });
}

// 3. Chapter III Wake Dracula Complete Email
export async function sendWakeDraculaCompleteEmail(session: StoredVisitorSession, details: {
  clicks: number;
  timeTakenSeconds: number;
  timeRemainingSeconds: number;
}) {
  const { to } = getAlertConfig();
  const formattedTime = formatAttemptTime(new Date().toISOString());

  const subject = `👑 🧛 Gothic Gate — Chapter III Dracula Awakened: ${session.userName} (20 Clicks in ${details.timeTakenSeconds}s)`;

  const plainText = [
    '======================================================',
    '👑 GOTHIC GATE — CHAPTER III: DRACULA AWAKENED',
    '======================================================',
    '',
    `Visitor: ${session.userName}`,
    `Challenge: Wake Up Dracula (20 clicks within 20s)`,
    `Clicks Reached: ${details.clicks} / 20`,
    `Time Taken: ${details.timeTakenSeconds}s (${details.timeRemainingSeconds}s remaining)`,
    `Result: Dracula is awake and gave the Golden Castle Key!`,
    `Time Recorded: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    '',
    `Alert sent to: ${to.join(', ')}`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 20px;">👑 🧛 Chapter III — Dracula Awakened!</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} successfully woke up Dracula.</p>
      </div>
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #fbbf24;">${escapeHtml(session.userName)}</span>
        </div>
        <div style="font-size: 13px; color: #4ade80; font-weight: bold; margin-bottom: 8px;">
          🔑 Golden Castle Key Claimed!
        </div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">⚡ <strong>Total Clicks:</strong> ${details.clicks} pokes</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">⏳ <strong>Time Taken:</strong> ${details.timeTakenSeconds}s (${details.timeRemainingSeconds}s remaining)</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px; font-family: monospace;">Time: ${escapeHtml(formattedTime)}</div>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `👑 Dracula Awakened: ${session.userName}`,
    webhookDesc: `**Visitor:** ${session.userName} woke up Dracula in **${details.timeTakenSeconds}s**!`,
  });
}

// 4. Chapter IV MBBS Medical Exam Complete Email (Full 10 questions breakdown)
export interface MBBSQuestionResult {
  questionNumber: number;
  category: string;
  prompt: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export async function sendMBBSQuizCompleteEmail(session: StoredVisitorSession, details: {
  score: number;
  totalQuestions: number;
  tierTitle: string;
  questions: MBBSQuestionResult[];
}) {
  const { to } = getAlertConfig();
  const formattedTime = formatAttemptTime(new Date().toISOString());
  const percentage = Math.round((details.score / (details.totalQuestions || 10)) * 100);

  const subject = `🩺 🧛 Gothic Gate — Chapter IV MBBS Medical Exam: ${session.userName} (Score: ${details.score}/${details.totalQuestions} - ${percentage}%)`;

  const rowsText = details.questions.map((q) => {
    return `Q#${q.questionNumber} [${q.category}]: ${q.prompt}\n  Selected: "${q.selectedOption}" (${q.isCorrect ? '✅ Correct' : `❌ Incorrect - Correct: ${q.correctAnswer}`})`;
  }).join('\n\n');

  const plainText = [
    '======================================================',
    '🩺 GOTHIC GATE — CHAPTER IV: DR. DRACULA MBBS EXAM RESULTS',
    '======================================================',
    '',
    `Doctor / Visitor: ${session.userName}`,
    `Exam Score: ${details.score} / ${details.totalQuestions} (${percentage}%)`,
    `Medical Rank / Diagnosis: ${details.tierTitle}`,
    `Completed At: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    '',
    '------------------------------------------------------',
    'QUESTION-BY-QUESTION BREAKDOWN:',
    '------------------------------------------------------',
    rowsText,
    '',
    `Alert sent to: ${to.join(', ')}`,
  ].join('\n');

  const rowsHtml = details.questions.map((q) => `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 10px; font-weight: bold; color: ${q.isCorrect ? '#4ade80' : '#f87171'}; vertical-align: top; width: 40px;">
        ${q.isCorrect ? '✅' : '❌'} #${q.questionNumber}
      </td>
      <td style="padding: 10px; vertical-align: top;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 2px;">
          ${escapeHtml(q.category)}
        </div>
        <div style="font-size: 13px; color: #f1f5f9; font-weight: 500; margin-bottom: 6px;">
          ${escapeHtml(q.prompt)}
        </div>
        <div style="font-size: 13px; color: ${q.isCorrect ? '#4ade80' : '#f87171'}; font-weight: 600;">
          Selected: "${escapeHtml(q.selectedOption)}"
        </div>
        ${!q.isCorrect ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Correct: <span style="color: #4ade80;">${escapeHtml(q.correctAnswer)}</span></div>` : ''}
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px;">🩺 🧛 Chapter IV — Dr. Dracula MBBS Medical Exam</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} finished the 10-question medical board exam.</p>
      </div>

      <!-- Score Card -->
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">
          👤 Candidate: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
        </div>
        <div style="display: flex; gap: 16px; margin-top: 10px;">
          <div>
            <div style="font-size: 24px; font-weight: 800; color: ${details.score >= 7 ? '#4ade80' : '#f59e0b'};">
              ${details.score} / ${details.totalQuestions}
            </div>
            <div style="font-size: 12px; color: #94a3b8;">Final Score (${percentage}%)</div>
          </div>
          <div style="border-left: 1px solid #334155; padding-left: 16px;">
            <div style="font-size: 15px; font-weight: 700; color: #f1f5f9;">
              ${escapeHtml(details.tierTitle)}
            </div>
            <div style="font-size: 12px; color: #94a3b8;">Medical Diagnosis</div>
          </div>
        </div>
      </div>

      <!-- Questions Breakdown -->
      <h3 style="color: #f1f5f9; font-size: 15px; margin: 0 0 10px 0;">📋 Complete Question & Answer Breakdown:</h3>
      <table style="width: 100%; border-collapse: collapse; background: #0c1220; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `🩺 MBBS Exam Results: ${session.userName} (${details.score}/${details.totalQuestions})`,
    webhookDesc: `**Doctor:** ${session.userName}\n**Score:** ${details.score}/10 (${percentage}%)\n**Diagnosis:** ${details.tierTitle}`,
  });
}

// 5. Chapter V Couple Edition Trivia Complete Email (Full 10 questions breakdown)
export interface CoupleQuestionResult {
  questionNumber: number;
  question: string;
  selectedChoice: 'DRACULA' | 'SK';
  feedbackLine1: string;
  feedbackLine2?: string;
}

export async function sendCoupleQuizCompleteEmail(session: StoredVisitorSession, details: {
  questions: CoupleQuestionResult[];
  draculaCount: number;
  skCount: number;
}) {
  const { to } = getAlertConfig();
  const formattedTime = formatAttemptTime(new Date().toISOString());

  const subject = `💖 🧛 Gothic Gate — Chapter V Couple Edition Quiz: ${session.userName} (Dracula: ${details.draculaCount} | SK: ${details.skCount})`;

  const rowsText = details.questions.map((q) => {
    return `Q#${q.questionNumber}: ${q.question}\n  Choice: ${q.selectedChoice} (${q.selectedChoice === 'DRACULA' ? 'Dracula 🧛‍♀️' : 'SK ✨'})\n  Reaction: "${q.feedbackLine1}"`;
  }).join('\n\n');

  const plainText = [
    '======================================================',
    '💖 GOTHIC GATE — CHAPTER V: COUPLE EDITION TRIVIA RESULTS',
    '======================================================',
    '',
    `Visitor: ${session.userName}`,
    `Dracula Chosen: ${details.draculaCount} times`,
    `SK Chosen: ${details.skCount} times`,
    `Completed At: ${formattedTime}`,
    `Session ID: ${session.sessionId}`,
    '',
    '------------------------------------------------------',
    'COUPLE TRIVIA QUESTIONS & SELECTIONS:',
    '------------------------------------------------------',
    rowsText,
    '',
    `Alert sent to: ${to.join(', ')}`,
  ].join('\n');

  const rowsHtml = details.questions.map((q) => `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 10px; font-weight: bold; color: #ec4899; vertical-align: top; width: 35px;">
        #${q.questionNumber}
      </td>
      <td style="padding: 10px; vertical-align: top;">
        <div style="font-size: 13px; color: #f1f5f9; font-weight: 500; margin-bottom: 4px;">
          ${escapeHtml(q.question)}
        </div>
        <div style="font-size: 13px; color: ${q.selectedChoice === 'DRACULA' ? '#f43f5e' : '#38bdf8'}; font-weight: 700; margin-bottom: 2px;">
          Chosen: ${q.selectedChoice === 'DRACULA' ? '🧛‍♀️ Dracula' : '✨ SK'}
        </div>
        <div style="font-size: 12px; color: #94a3b8; font-style: italic;">
          "${escapeHtml(q.feedbackLine1)}"
        </div>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #ec4899; font-size: 20px;">💖 🧛 Chapter V — Couple Edition Trivia</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} answered all 10 couple questions.</p>
      </div>

      <!-- Stats Box -->
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #ec4899;">${escapeHtml(session.userName)}</span>
        </div>
        <div style="display: flex; gap: 20px; margin-top: 8px;">
          <div>
            <span style="font-size: 18px; font-weight: 800; color: #f43f5e;">${details.draculaCount}</span>
            <span style="font-size: 13px; color: #94a3b8; margin-left: 4px;">Dracula Picks 🧛‍♀️</span>
          </div>
          <div style="border-left: 1px solid #334155; padding-left: 20px;">
            <span style="font-size: 18px; font-weight: 800; color: #38bdf8;">${details.skCount}</span>
            <span style="font-size: 13px; color: #94a3b8; margin-left: 4px;">SK Picks ✨</span>
          </div>
        </div>
      </div>

      <!-- Questions Breakdown -->
      <h3 style="color: #f1f5f9; font-size: 15px; margin: 0 0 10px 0;">💕 Couple Trivia Responses:</h3>
      <table style="width: 100%; border-collapse: collapse; background: #0c1220; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `💖 Couple Quiz Complete: ${session.userName}`,
    webhookDesc: `**Visitor:** ${session.userName}\n**Dracula:** ${details.draculaCount} | **SK:** ${details.skCount}`,
  });
}

// 6. Complete Quest Grand Dossier Email (ALL 6 Chapters + Voice Audio attachments)
export async function sendCompletedDossierEmail(session: StoredVisitorSession): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { to } = getAlertConfig();
  const durationMin = Math.floor((session.durationSeconds || 0) / 60);
  const durationSec = (session.durationSeconds || 0) % 60;
  const durationStr = durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`;
  const formattedStart = formatAttemptTime(session.startTime);
  const formattedEnd = formatAttemptTime(session.completedTime || new Date().toISOString());

  const subject = `🎂 🏰 🧛 Gothic Gate — Complete Quest Dossier: ${session.userName} (All 6 Chapters Completed!)`;

  const textLines = [
    '======================================================',
    '🎂 GOTHIC GATE — COMPLETED VISITOR DOSSIER (ALL CHAPTERS)',
    '======================================================',
    '',
    `Visitor Name: ${session.userName}`,
    session.moniker ? `Vampire Moniker: ${session.moniker}` : '',
    session.email ? `Visitor Email: ${session.email}` : '',
    `Quest Duration: ${durationStr}`,
    `Start Time: ${formattedStart}`,
    `Completed At: ${formattedEnd}`,
    `Total Answers Recorded: ${session.answers.length}`,
    `Session ID: ${session.sessionId}`,
    '',
    '------------------------------------------------------',
    'ALL RECORDED QUESTIONS & ANSWERS ACROSS ALL CHAPTERS:',
    '------------------------------------------------------',
  ];

  session.answers.forEach((ans, idx) => {
    textLines.push(
      `\n[Chapter/Q#${ans.questionNumber || idx + 1}] ${ans.questionTitle}`,
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
    'End of Dossier.'
  );

  const plainText = textLines.filter(Boolean).join('\n');

  const answersRowsHtml = session.answers
    .map((ans, idx) => {
      const isVoice = ans.method === 'voice';
      const hasAudio = Boolean(ans.audioBase64 && ans.audioBase64.length > 200);
      return `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px; font-weight: bold; color: #f43f5e; vertical-align: top; width: 35px;">#${ans.questionNumber || idx + 1}</td>
          <td style="padding: 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 14px; margin-bottom: 4px;">${escapeHtml(ans.questionTitle)}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">${escapeHtml(ans.questionPrompt)}</div>
            <div style="background: #090d16; border-left: 3px solid #f43f5e; padding: 8px 12px; border-radius: 4px; font-style: italic; color: #ffffff; font-size: 14px;">
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 28px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 6px 0; color: #f43f5e; font-size: 22px;">🎂 🏰 🧛 Gothic Gate — Complete Quest Dossier</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 14px;">The visitor has completed all 6 chapters of the Birthday Journey!</p>
      </div>

      <div style="background: #0f172a; border: 1px solid #1e2d4d; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          👤 Visitor: <span style="color: #f43f5e;">${escapeHtml(session.userName)}</span>
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

      <h3 style="color: #f1f5f9; font-size: 16px; margin: 0 0 12px 0;">📜 All Recorded Question Answers:</h3>
      <table style="width: 100%; border-collapse: collapse; background: #0c1220; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          ${answersRowsHtml}
        </tbody>
      </table>

      <div style="background: #0b1528; border: 1px dashed #38bdf8; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #93c5fd; margin-bottom: 20px;">
        🎙️ <strong>Voice Audio Files:</strong> All audio clips recorded from the visitor have been safely attached.
      </div>

      <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">Gothic Gate Visitor Log System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  // Collect attachments
  const attachments: EmailAttachment[] = [];
  session.answers.forEach((ans, idx) => {
    if (ans.audioBase64 && ans.audioBase64.length > 200) {
      const raw = stripDataUrl(ans.audioBase64);
      if (raw.length > 50) {
        attachments.push({
          filename: ans.attachmentFilename || `gothic-q${idx + 1}-voice.webm`,
          content: raw,
        });
      }
    }
  });

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    attachments,
    webhookTitle: `🏆 Complete Quest Dossier: ${session.userName}`,
    webhookDesc: `**Visitor:** ${session.userName} completed all chapters in **${durationStr}** (${session.answers.length} answers saved)!`,
  });
}

// 7. Reset/Restart Alert Email
export async function sendResetAlertEmail(session: StoredVisitorSession, stageName = 'Entrance') {
  const { to } = getAlertConfig();
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px;">🔄 🧛 Gothic Gate — Visitor Reset / Replay</h2>
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
      <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">Gothic Gate Alert System &bull; Delivered to ${escapeHtml(to.join(', '))}</p>
    </div>
  `;

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    webhookTitle: `🔄 Quest Reset/Restart: ${session.userName}`,
    webhookDesc: `Visitor **${session.userName}** restarted at **${stageName}**.`,
  });
}

// 8. Individual Question Answer Alert Email (Rate-limited safe dispatch)
export async function sendAnswerAlertEmail(session: StoredVisitorSession, answer: StoredAnswer) {
  const { to } = getAlertConfig();
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #070a12; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; padding: 24px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 20px;">📝 🧛 Question #${answer.questionNumber} Answered</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(session.userName)} just submitted an answer.</p>
      </div>

      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
        <div style="font-size: 15px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">
          👤 Visitor: <span style="color: #38bdf8;">${escapeHtml(session.userName)}</span>
          ${session.moniker ? `<span style="font-size: 12px; color: #94a3b8; font-weight: normal;"> (${escapeHtml(session.moniker)})</span>` : ''}
        </div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;"><strong>Challenge:</strong> ${escapeHtml(answer.questionTitle)}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">${escapeHtml(answer.questionPrompt)}</div>

        <div style="background: #030712; border-left: 3px solid #38bdf8; padding: 10px 14px; border-radius: 4px; color: #ffffff; font-size: 15px; font-style: italic; margin-bottom: 12px;">
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

  const attachments: EmailAttachment[] = [];
  if (hasAudio && answer.audioBase64) {
    const raw = stripDataUrl(answer.audioBase64);
    if (raw.length > 50) {
      attachments.push({
        filename: answer.attachmentFilename || 'recording.webm',
        content: raw,
      });
    }
  }

  return sendUniversalEmailAlert({
    subject,
    plainText,
    html,
    attachments,
  });
}
