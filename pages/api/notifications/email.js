/**
 * Email Notification API — Resend ile bildirim mailleri
 * POST /api/notifications/email — { email, name, subject, message, type }
 * GET  /api/notifications/email — status check
 */

import { sendNotificationEmail, isEmailConfigured } from '../../../lib/email.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({
      configured: isEmailConfigured(),
      message: isEmailConfigured() ? 'Resend ready' : 'RESEND_API_KEY missing',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, subject, message, type } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'RESEND_API_KEY not configured' });
  }

  const subjectPrefix = type === 'reminder' ? '⏰ Hatırlatma' :
                        type === 'motivation' ? '💪 Motivasyon' :
                        type === 'goal' ? '🎯 Hedef' :
                        type === 'habit' ? '📊 Alışkanlık' :
                        '🔔 Bildirim';

  try {
    await sendNotificationEmail({
      email,
      name,
      subject: `${subjectPrefix} — ${subject || 'LifeCoach Bildirimi'}`,
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      message: 'Email bildirimi gönderildi.',
    });
  } catch (err) {
    console.error('[Email Notification] Error:', err.message);
    return res.status(502).json({ error: 'Email gönderilemedi.' });
  }
}
