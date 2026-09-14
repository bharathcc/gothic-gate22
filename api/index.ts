import nodemailer from 'nodemailer';

// Direct Gmail SMTP Configuration
const SMTP_USER = process.env.SMTP_USER || 'kmsiddesh009@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'duazxpwiixtdrbqt';
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || 'kmsiddesh009@gmail.com';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS.replace(/\s+/g, ''),
    },
  });
}

async function sendMail(subject: string, html: string, text?: string) {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: `"🧛 Gothic Castle Gatekeeper" <${SMTP_USER}>`,
    to: ALERT_EMAIL_TO,
    subject,
    text: text || subject,
    html,
  });
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const body = req.body || {};

  try {
    // 1. Health check
    if (url.includes('/health')) {
      return res.status(200).json({ status: 'ok', serverless: true, timestamp: new Date().toISOString() });
    }

    // 2. Test Email
    if (url.includes('/test-email') || url.includes('/admin/test-dispatch')) {
      const info = await sendMail(
        '🏰 Dracula Quest Serverless Test Alert',
        `<h2>Castle Alert System Online</h2><p>This test email confirms your serverless email dispatch is working for <b>${ALERT_EMAIL_TO}</b>.</p>`
      );
      return res.status(200).json({ success: true, messageId: info.messageId });
    }

    // 3. Attempt Alert
    if (url.includes('/attempt-alert')) {
      const { userName, attemptNumber, method, submittedAnswer, isCorrect, moniker } = body;
      const visitorName = userName || 'Mortal Visitor';
      const statusIcon = isCorrect ? '✅ GRANTED' : '❌ DENIED';
      const subject = `🏰 Gate Attempt #${attemptNumber || 1} [${isCorrect ? 'CORRECT' : 'WRONG'}]: ${visitorName}`;

      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#f8fafc;border-radius:8px;">
          <h2 style="color:#f43f5e;margin-top:0;">🧛 Gothic Gate Attempt Alert</h2>
          <p><strong>Visitor:</strong> ${visitorName} ${moniker ? `(${moniker})` : ''}</p>
          <p><strong>Attempt:</strong> #${attemptNumber || 1} (${method || 'typed'})</p>
          <p><strong>Result:</strong> ${statusIcon}</p>
          <p><strong>Submitted Answer:</strong> "${submittedAnswer || ''}"</p>
          <p style="color:#94a3b8;font-size:12px;">Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `;

      const info = await sendMail(subject, html);
      return res.status(200).json({ success: true, emailSent: true, id: info.messageId });
    }

    // 4. Visitor Login Session
    if (url.includes('/visitor/session')) {
      const { userName, moniker, email } = body;
      const visitorName = userName || 'Mortal Visitor';
      const subject = `🏰 New Visitor Login: ${visitorName}`;

      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#f8fafc;border-radius:8px;">
          <h2 style="color:#38bdf8;margin-top:0;">🏰 Gothic Gate Visitor Entry</h2>
          <p><strong>Visitor:</strong> ${visitorName}</p>
          ${moniker ? `<p><strong>Moniker:</strong> ${moniker}</p>` : ''}
          ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
          <p style="color:#94a3b8;font-size:12px;">Login Time: ${new Date().toLocaleString()}</p>
        </div>
      `;

      const info = await sendMail(subject, html);
      return res.status(200).json({ success: true, id: info.messageId });
    }

    // 5. Milestones & Quizzes (Puzzle, Wake Dracula, MBBS, Couple, Complete Quest)
    if (
      url.includes('/puzzle/complete') ||
      url.includes('/wake-dracula/complete') ||
      url.includes('/quiz/mbbs-complete') ||
      url.includes('/quiz/couple-complete') ||
      url.includes('/visitor/complete-quest')
    ) {
      const actionName = url.split('/').pop() || 'milestone';
      const visitorName = body.userName || 'Mortal Visitor';
      const subject = `🏆 Quest Milestone [${actionName}]: ${visitorName}`;

      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#f8fafc;border-radius:8px;">
          <h2 style="color:#eab308;margin-top:0;">🏆 Chapter Milestone Completed!</h2>
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Stage / Action:</strong> ${actionName}</p>
          <pre style="background:#1e293b;padding:12px;border-radius:6px;color:#cbd5e1;overflow:auto;">${JSON.stringify(body, null, 2)}</pre>
          <p style="color:#94a3b8;font-size:12px;">Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `;

      const info = await sendMail(subject, html);
      return res.status(200).json({ success: true, id: info.messageId });
    }

    // Default catch-all
    return res.status(200).json({ success: true, message: 'Received', path: url });
  } catch (error: any) {
    console.error('[Serverless API Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Server error' });
  }
}
