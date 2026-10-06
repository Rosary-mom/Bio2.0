export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};

  // Erweiterte Woo-spezifische Felder (basierend auf deinem alten PHP Snippet)
  const wooFields = {
    _esg_schranke_paid: true,
    _esg_level: "full",
    _esg_fivefold_fields: [payload.field || "unknown"],
    _esg_paid_date: new Date().toISOString(),
    stufe: payload.field ? payload.field.toLowerCase().replace(/\s+/g, '_') : "general",
    note: `ESG Webhook empfangen für ${payload.field}. Human Review ausgelöst. Secret: ESG-UNLOCK-${Date.now().toString(36).toUpperCase()}`,
    source: "entscheidungsmatrix-vercel"
  };

  // Email-Benachrichtigung simulieren (wie in deinem Woo-Hook + Email-Snippet)
  const emailNotification = {
    to: "admin@rosary.health",
    cc: payload.email || "customer@example.com",
    subject: `ESG Unlock / Webhook: ${payload.field} - ${wooFields.stufe}`,
    body: `Hallo,

Webhook von Entscheidungsmatrix empfangen.

Feld: ${payload.field}
Text: ${payload.text || "(kein Text)"}
File: ${payload.fileName || "keine Datei"}
Timestamp: ${payload.timestamp}

Woo-Meta:
${JSON.stringify(wooFields, null, 2)}

Secret für manuelles Unlock: ESG-UNLOCK-${Date.now().toString(36).toUpperCase()}
Oder HUMAN-SECRET-ROSARY-2026

Human Review erforderlich.

-- 
Rosary ESG Chain v1
`,
    sent: true,
    timestamp: new Date().toISOString()
  };

  // Log for Vercel
  console.log("ESG Webhook received:", { payload, wooFields, emailNotification });

  // Erweiterte Response (Frontend kann Email + Woo-Felder anzeigen)
  res.status(200).json({
    ok: true,
    received: payload,
    wooFields,
    emailNotification,
    message: "Webhook processed. Email notification prepared. Human review triggered.",
    secret: `ESG-UNLOCK-${Date.now().toString(36).toUpperCase()}`
  });
}
