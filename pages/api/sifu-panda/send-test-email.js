/**
 * Test email endpoint — hiçbir şarta bağlı değil, direkt Resend'e gider.
 * GET /api/sifu-panda/send-test-email
 */

export default async function handler(req, res) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    return res.status(503).json({ error: 'RESEND_API_KEY not configured' });
  }

  const dgRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sifu Panda 🐼 <noreply@han-ai.dev>',
      to: ['metehanhaydarerbas@gmail.com'],
      subject: '🐼 Sifu Panda Test',
      html: '<p>Merhaba Metehan! Bu bir test mailidir.</p><p>Eğer bunu görüyorsan email sistemi çalışıyor! 🎉</p>',
    }),
  });

  const body = await dgRes.text().catch(() => '');
  const status = dgRes.status;

  res.status(status).json({
    ok: dgRes.ok,
    status,
    body: body.slice(0, 500),
  });
}
