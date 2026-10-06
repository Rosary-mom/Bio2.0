module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};

  const wooFields = {
    _esg_schranke_paid: true,
    _esg_level: "full",
    _esg_fivefold_fields: [payload.field || "unknown"],
    _esg_paid_date: new Date().toISOString(),
    stufe: payload.field ? payload.field.toLowerCase().replace(/\s+/g, '_') : "general",
    note: `ESG Webhook empfangen für ${payload.field}. Human Review ausgelöst.`,
    source: "entscheidungsmatrix-vercel"
  };

  const emailNotification = {
    to: "admin@rosary.health",
    cc: payload.email || "customer@example.com",
    subject: `ESG Unlock / Webhook: ${payload.field} - ${wooFields.stufe}`,
    body: `Webhook von Entscheidungsmatrix empfangen.\n\nFeld: ${payload.field}\nText: ${payload.text || "(kein Text)"}\nFile: ${payload.fileName || "keine Datei"}\nTimestamp: ${payload.timestamp}\n\nWoo-Meta:\n${JSON.stringify(wooFields, null, 2)}\n\nSecret für manuelles Unlock: HUMAN-SECRET-ROSARY-2026\n\nHuman Review erforderlich.\n\n-- Rosary ESG Chain v1`,
    sent: true,
    timestamp: new Date().toISOString()
  };

  console.log("ESG Webhook received:", { payload, wooFields });

  res.status(200).json({
    ok: true,
    received: payload,
    wooFields,
    emailNotification,
    message: "Webhook processed. Email notification prepared. Human review triggered.",
    secret: "HUMAN-SECRET-ROSARY-2026"
  });
};
