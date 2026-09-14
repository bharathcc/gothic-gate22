import nodemailer from 'nodemailer';

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

export const handler = async (event: any) => {
  const path = event.path || '';
  let body: any = {};
  try {
    if (event.body) {
      body = JSON.parse(event.body);
    }
  } catch {}

  const transporter = createTransporter();

  try {
    if (path.includes('/attempt-alert')) {
      const { userName, attemptNumber, method, submittedAnswer, isCorrect } = body;
      const statusIcon = isCorrect ? '✅ GRANTED' : '❌ DENIED';
      const subject = `🏰 Gate Attempt #${attemptNumber || 1} [${isCorrect ? 'CORRECT' : 'WRONG'}]: ${userName || 'Mortal Visitor'}`;

      const info = await transporter.sendMail({
        from: `"🧛 Gothic Castle Gatekeeper" <${SMTP_USER}>`,
        to: ALERT_EMAIL_TO,
        subject,
        html: `<h2>🧛 Gothic Gate Attempt Alert</h2><p>Visitor: <b>${userName || 'Mortal Visitor'}</b></p><p>Attempt: #${attemptNumber || 1} (${method})</p><p>Result: ${statusIcon}</p><p>Answer: "${submittedAnswer || ''}"</p>`,
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, emailSent: true, id: info.messageId }),
      };
    }

    if (path.includes('/visitor/session') || path.includes('/complete-quest') || path.includes('/quiz/')) {
      const subject = `🏰 Gothic Quest Update: ${body.userName || 'Mortal Visitor'}`;
      const info = await transporter.sendMail({
        from: `"🧛 Gothic Castle Gatekeeper" <${SMTP_USER}>`,
        to: ALERT_EMAIL_TO,
        subject,
        html: `<h2>Gothic Quest Activity</h2><pre>${JSON.stringify(body, null, 2)}</pre>`,
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, id: info.messageId }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Processed', path }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error?.message || 'Error' }),
    };
  }
};
