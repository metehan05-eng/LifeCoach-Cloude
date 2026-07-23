/**
 * Email utility — Resend API ile mail gönderme
 * Kullanım: sendEmail({ to, subject, html })
 * Requires RESEND_API_KEY in environment.
 */

const RESEND_API = 'https://api.resend.com/emails';

function getApiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes('PLACEHOLDER') || key.includes('Your')) return null;
  return key;
}

export async function sendEmail({ to, subject, html, from } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'LifeCoach AI <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function sendNotificationEmail({ email, name, subject, message }) {
  return sendEmail({
    to: email,
    subject: `[LifeCoach] ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🧘 LifeCoach AI</h1>
        </div>
        <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e2e8f0;">
          <p style="margin-top: 0;">Merhaba ${name || 'Değerli Kullanıcı'},</p>
          <div style="background: #16213e; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; line-height: 1.6;">${message}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">
            Bu bildirimi devre dışı bırakmak için ayarlar sayfasını ziyaret edin.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendFeedbackEmail({ userEmail, userName, subject, message }) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'metehan@lifecoach.app',
    subject: `[Feedback] ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">💬 Yeni Geri Bildirim</h1>
        </div>
        <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e2e8f0;">
          <p><strong>Gönderen:</strong> ${userName || 'İsimsiz'} (${userEmail || 'email yok'})</p>
          <p><strong>Konu:</strong> ${subject}</p>
          <div style="background: #16213e; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      </div>
    `,
  });
}

export function isEmailConfigured() {
  return !!getApiKey();
}
