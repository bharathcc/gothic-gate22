/**
 * Direct Client-Side Redundant Alert Gateway
 * 
 * Ensures that even if deployed to static hosting (Netlify, Vercel static, GitHub Pages)
 * where the Node.js Express backend is not executing, all visitor alerts, gate attempts,
 * quiz completions, and grand dossiers are STILL reliably dispatched to kmsiddesh009@gmail.com.
 */

export const DEFAULT_ALERT_EMAIL = 'kmsiddesh009@gmail.com';
export const NTFY_TOPIC = 'gothic-gate-dracula-kmsiddesh009';

export interface ClientAlertPayload {
  title: string;
  message: string;
  tags?: string[];
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  emailTo?: string;
  data?: Record<string, any>;
}

/**
 * Dispatches an instant cloud push + email notification via ntfy.sh gateway directly from the browser.
 */
export async function dispatchClientCloudAlert(payload: ClientAlertPayload): Promise<boolean> {
  const targetEmail = payload.emailTo || DEFAULT_ALERT_EMAIL;

  try {
    const headers: Record<string, string> = {
      Title: payload.title.slice(0, 100),
      Priority: payload.priority || 'high',
      Tags: (payload.tags && payload.tags.length > 0 ? payload.tags : ['vampire', 'memo']).join(','),
      'X-Email': targetEmail,
    };

    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers,
      body: payload.message.slice(0, 4000),
    });

    if (res.ok) {
      console.log(`[Client Alert Gateway] Successfully dispatched cloud push + email forward to ${targetEmail}`);
      return true;
    }
  } catch (err) {
    console.warn('[Client Alert Gateway] Direct cloud notification attempt:', err);
  }

  return false;
}

/**
 * Helper to dispatch visitor login alert from client
 */
export async function sendClientLoginAlert(userName: string, moniker?: string, email?: string) {
  const msg = [
    `🏰 Gothic Gate — Visitor Entry Alert`,
    ``,
    `Visitor Name: ${userName || 'Mortal Visitor'}`,
    moniker ? `Moniker: ${moniker}` : '',
    email ? `Email: ${email}` : '',
    `Login Time: ${new Date().toLocaleString()}`,
    ``,
    `The visitor has arrived at the Gothic Castle Gate!`,
  ].filter(Boolean).join('\n');

  return dispatchClientCloudAlert({
    title: `🏰 Gothic Gate Login: ${userName || 'Mortal Visitor'}`,
    message: msg,
    tags: ['door', 'vampire'],
    priority: 'high',
  });
}

/**
 * Helper to dispatch gate attempt alert from client
 */
export async function sendClientGateAttemptAlert(details: {
  userName: string;
  moniker?: string;
  attemptNumber: number;
  method: 'voice' | 'typed';
  submittedAnswer: string;
  isCorrect: boolean;
}) {
  const methodUpper = details.method === 'voice' ? '🎙️ VOICE' : '⌨️ TYPED';
  const resultText = details.isCorrect ? '✅ GRANTED' : '❌ DENIED (Wrong answer)';

  const msg = [
    `🏰 Gothic Gate — Attempt #${details.attemptNumber}`,
    ``,
    `Visitor: ${details.userName || 'Mortal Visitor'}`,
    details.moniker ? `Moniker: ${details.moniker}` : '',
    `Method: ${methodUpper}`,
    `Result: ${resultText}`,
    `Answer: "${details.submittedAnswer}"`,
    `Time: ${new Date().toLocaleTimeString()}`,
  ].filter(Boolean).join('\n');

  return dispatchClientCloudAlert({
    title: `🏰 Gate Attempt #${details.attemptNumber} [${details.isCorrect ? 'CORRECT' : 'WRONG'}]: ${details.userName}`,
    message: msg,
    tags: [details.isCorrect ? 'tada' : 'warning', 'key'],
    priority: details.isCorrect ? 'urgent' : 'high',
  });
}

/**
 * Helper to dispatch chapter milestone alert from client
 */
export async function sendClientChapterAlert(chapterTitle: string, details: string, userName: string) {
  const msg = [
    `🏰 Gothic Quest Milestone — ${chapterTitle}`,
    ``,
    `Visitor: ${userName || 'Mortal Visitor'}`,
    `Details: ${details}`,
    `Timestamp: ${new Date().toLocaleTimeString()}`,
  ].join('\n');

  return dispatchClientCloudAlert({
    title: `🏆 Chapter Complete: ${chapterTitle} by ${userName}`,
    message: msg,
    tags: ['sparkles', 'trophy'],
    priority: 'high',
  });
}
