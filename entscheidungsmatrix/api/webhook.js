const MAIL = ["eurobitz@Jesus.tips", "uwe.rosenkranz@gmail.com"];
const UNLOCK_API = "https://rosary.health/wp-json/rosary/v1/esg-unlock";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body || {};
  const status = String(payload.status || payload.order_status || "").toLowerCase();
  const isWooOrder = Boolean(payload.order_key || payload.line_items || payload.billing);
  const paidStatus = status === "processing" || status === "completed";

  if (isWooOrder && !paidStatus) {
    return res.status(202).json({
      ok: false,
      unlocked: false,
      message: "Bestellung noch nicht bezahlt. Freischaltung erst bei processing oder completed.",
      emailNotification: { to: MAIL, sent: false, transport: "wordpress-wp_mail" }
    });
  }

  let paidCheck = { ok: false, skipped: true };
  if (!isWooOrder) {
    const secret = String(payload.secret || "");
    if (!secret) {
      return res.status(402).json({
        ok: false,
        unlocked: false,
        message: "Upload abgelehnt. Erst nach bezahlter Bestellung, Secret fehlt.",
        emailNotification: { to: MAIL, sent: false, transport: "wordpress-wp_mail" }
      });
    }
    try {
      const check = await fetch(UNLOCK_API + "?secret=" + encodeURIComponent(secret));
      paidCheck = await check.json();
    } catch (err) {
      paidCheck = { ok: false, message: "Woo-Prüfung nicht erreichbar." };
    }
    if (!paidCheck || !paidCheck.ok) {
      return res.status(402).json({
        ok: false,
        unlocked: false,
        message: (paidCheck && paidCheck.message) || "Zahlung nicht bestätigt.",
        emailNotification: { to: MAIL, sent: false, transport: "wordpress-wp_mail" }
      });
    }
  }

  const wooFields = {
    _esg_schranke_paid: true,
    _esg_level: payload.level || "paid",
    _esg_fivefold_fields: payload.field
      ? [payload.field]
      : ["Pandämie", "Flug DF1073", "Regeländerung IMK", "9/11"],
    _esg_paid_date: new Date().toISOString(),
    order_id: payload.id || payload.order_id || paidCheck.order || null,
    source: "entscheidungsmatrix-vercel"
  };

  const emailNotification = {
    to: MAIL,
    subject: isWooOrder
      ? "ESG bezahlt #" + (payload.id || "")
      : "ESG Upload: " + (payload.field || "Feld"),
    body: [
      "Webhook der Entscheidungsmatrix.",
      "Feld: " + (payload.field || "(Zahlungs-Webhook)"),
      "Text: " + (payload.text || ""),
      "Datei: " + (payload.fileName || ""),
      "Bestellung: " + (wooFields.order_id || ""),
      "Status: " + (status || "upload"),
      "",
      "Versand macht das Snippet auf rosary.health per wp_mail.",
      "Empfänger: " + MAIL.join(", ")
    ].join("\n"),
    sent: false,
    transport: "wordpress-wp_mail",
    timestamp: new Date().toISOString()
  };

  res.status(200).json({
    ok: true,
    unlocked: true,
    wooFields,
    emailNotification,
    message: "Angenommen. E-Mail versendet das WordPress-Snippet, nicht diese Funktion."
  });
};
