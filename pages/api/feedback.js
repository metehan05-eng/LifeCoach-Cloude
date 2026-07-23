/**
 * Feedback API — Kullanıcı geri bildirimlerini Resend ile email olarak gönderir.
 * POST /api/feedback — { name, email, subject, message }
 */

import { sendFeedbackEmail, isEmailConfigured } from '../../lib/email.js';

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    return isEmailConfigured()
      ? res.status(200).end()
      : res.status(503).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'RESEND_API_KEY not configured' });
  }

  try {
    await sendFeedbackEmail({
      userEmail: email || 'anonymous@lifecoach.app',
      userName: name || 'Anonymous',
      subject: subject || 'Genel Geri Bildirim',
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      message: 'Geri bildiriminiz için teşekkürler! 🎉',
    });
  } catch (err) {
    console.error('[Feedback] Error:', err.message);
    return res.status(502).json({ error: 'Feedback gönderilemedi.' });
  }
}
