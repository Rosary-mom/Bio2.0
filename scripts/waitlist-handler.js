'use strict';
/**
 * Vercel Node function: /api/waitlist  (ohne npm-Abhängigkeiten, Node >= 18)
 *   POST /api/waitlist                  -> Anmeldung (JSON)
 *   GET  /api/waitlist?confirm=<token>  -> Double-Opt-in bestätigen
 *   GET  /api/waitlist?unsubscribe=<token> -> Abmelden
 *
 * Env:
 *   DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING / DATABASE_URL  Neon (Vercel-Integration; HTTP-SQL-API, kein Treiber)
 *   TURNSTILE_SECRET fehlt -> Turnstile nicht erzwungen (Honeypot, Zeit, Rate-Limit, Inhaltsregeln, B-Quarantäne bleiben)
 *   RESEND_API_KEY/MAIL_FROM fehlen -> kein Versand, Status 'pending_mail' (bzw. 'quarantine'), Hinweis nur im Log
 *   WAITLIST_ADMIN_TOKEN               Header x-waitlist-admin für GET ?admin=stats und DELETE ?admin=purge-test
 *   TURNSTILE_SECRET                  Cloudflare-Turnstile-Secret-Key
 *   RESEND_API_KEY, MAIL_FROM         Mailversand (z. B. "ROSARY Warteliste <warteliste@mail.rosary.health>")
 *   PUBLIC_BASE_URL                   z. B. https://hmpsm-lander5787.vercel.app
 *   IP_HASH_SALT                      zufälliger String (IP wird nur gehasht gespeichert)
 *   optional: MIN_FILL_MS (3000), RATE_LIMIT_PER_HOUR (5), TURNSTILE_HOSTNAMES (kommagetrennt),
 *             NOTIFY_EMAIL (Hinweis bei Quarantäne), REQUIRE_TURNSTILE ("0" nur für lokale Tests)
 */
const crypto = require('crypto');

// ---------- Spam-Regeln (aus 259 Blog-Formular-Proben abgeleitet) ----------
const DISPOSABLE = new Set([
  // aus den Proben
  'savmask.com','ventura17.ru','avtovoz-av10.ru','olegrova-tatianas.site','bedavasohbetodalari.site','megafono.site',
  'zapovedniki.com','crypto-news.fun','bystriy324andy.site','imhotester.forum','tacoblastmail.com','bounce3d.store',
  'quieresmail.com','tempmail.us.com','twitch.work',
  // bekannte SEO-/Marketing-Spammer aus den Proben
  'digital-x-press.com','professionalseocleanup.com','speed-seo.net','monkeydigital.co','strictlydigital.net',
  'recodecommerce.com','bangeshop.com','tidbuy.com',
  // verbreitete Wegwerf-Anbieter
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.de','sharklasers.com','grr.la','10minutemail.com',
  '10minutemail.net','temp-mail.org','tempmail.com','tempmail.net','tempmailo.com','tempr.email','throwawaymail.com',
  'yopmail.com','yopmail.fr','yopmail.net','getnada.com','nada.email','maildrop.cc','dispostable.com','trashmail.com',
  'trashmail.de','trashmail.net','wegwerfmail.de','wegwerfmail.net','einrot.com','spambog.com','spambog.de',
  'mailnesia.com','mintemail.com','mohmal.com','emailondeck.com','fakeinbox.com','fakemail.net','mytemp.email',
  'tempinbox.com','burnermail.io','moakt.com','mail.tm','mail.gw','dropmail.me','emailfake.com','inboxkitten.com',
  'luxusmail.org','spamgourmet.com','mailcatch.com','byom.de','discard.email','33mail.com','anonaddy.me',
  'mvrht.com','cuvox.de','armyspy.com','dayrep.com','einrot.de','fleckens.hu','gustr.com','jourrapide.com',
  'rhyta.com','superrito.com','teleworm.us','tmail.ws','tmpmail.org','tmpmail.net','emltmp.com','vomoto.com',
]);
const FREEMAIL = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.de','hotmail.com','hotmail.de','outlook.com',
  'outlook.de','live.com','icloud.com','me.com','aol.com','gmx.de','gmx.net','gmx.com','web.de','t-online.de',
  'freenet.de','mail.com','proton.me','protonmail.com','yandex.ru','yandex.com','mail.ru','posteo.de','mailbox.org']);
const SUSPICIOUS_TLD = /\.(ru|su|site|fun|store|forum|work|xyz|top|click|buzz|icu|monster|rest|cyou|cfd|sbs|lol|ph)$/i;
const KEYWORDS = [
  '888starz','pinco','pin-up','chicken road','chicken-road','casino','syncswap','xevil','termigram','tomyaccount',
  'semrush','backlink','domain authority','guest post','link building','seo service','seo report','ranking on google',
  'youtube promotion','promote your channel','social media promotion','video promotion','instagram audience',
  'growth service','social ads','boost your ranks','drive more leads','dear webmaster','online presence',
  'bookmark added','now saved this','binance','gift card','withdrawal','crypto wallet','airdrop','escort',
  'i promised.','business cooperation','is this your current company','posture corrector','dog harness','weicy',
  'your the price','blackberry','flip phone','telegra.ph','t.me/','whatsapp +','bitcoin','usdt','forex',
  'withdraw now','you won $','privatkredit','hsbc credit','loan offer','investment opportunity','guaranteed profit','наркол','казино','ставки','займ','кухни',
  'ich wünsche weitere informationen. bitte kontaktieren sie mich per e-mail',
];

function analyze(input) {
  const hard = [];
  const soft = [];
  const name = input.name || '';
  const email = input.email || '';
  const pain = input.pain || '';
  const domain = email.split('@')[1] || '';
  const all = `${name} ${pain} ${input.machines || ''}`;
  const low = `${all} ${email}`.toLowerCase();

  if (DISPOSABLE.has(domain)) hard.push('disposable_domain');
  if (domain.endsWith('rosary.health') || domain.endsWith('rosary.eu.com')) hard.push('own_domain');
  const kw = KEYWORDS.find((k) => low.includes(k));
  if (kw) hard.push('keyword:' + kw);
  if (/\b(seo|aeo|smm)\b/i.test(all) || /website traffic|google spam update/i.test(all)) hard.push('seo_spam');
  if ([...DISPOSABLE].some((d) => domain.endsWith('.' + d))) hard.push('disposable_subdomain');
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(ru|site|fun|store|forum|work|xyz|top|click|ph)\b)/i.test(all)) hard.push('link');
  const letters = (all.match(/\p{L}/gu) || []).length;
  const foreign = (all.match(/[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}\p{Script=Hangul}\p{Script=Thai}]/gu) || []).length;
  if (letters && foreign / letters > 0.3) hard.push('foreign_script');
  if ((all.match(/[\u1EA0-\u1EF9]/g) || []).length >= 3) hard.push('foreign_script_vi');
  for (const f of [name, pain]) {
    const rnd = (f.match(/\p{L}{8,}/gu) || []).some((w) => (w.match(/\p{Lu}/gu) || []).length >= 3
      && (w.match(/\p{Ll}/gu) || []).length >= 3 && /\p{Ll}\p{Lu}.*\p{Ll}\p{Lu}/u.test(w));
    if (rnd) { hard.push('random_string'); break; }
  }
  if (name && pain && name.trim() === pain.trim()) hard.push('name_equals_text');
  const local = email.split('@')[0] || '';
  if ((local.match(/\./g) || []).length >= 3) hard.push('dotted_local');

  if (SUSPICIOUS_TLD.test(domain)) soft.push('suspicious_tld');
  if (FREEMAIL.has(domain)) soft.push('freemail');
  if (/\d{4,}/.test(local)) soft.push('digits_in_local');
  if (/\d{3,}$/.test(name)) soft.push('digits_in_name');
  if (!/\s/.test(name.trim())) soft.push('single_word_name');
  return { hard, soft };
}

/**
 * Entscheidung: A = "reject" bei hard-Flags, sonst pending (soft-Flags werden nur protokolliert).
 * B (streng): hard -> reject; jedes soft-Flag -> quarantine (keine Bestätigungsmail, manuelle Prüfung).
 */
function decide(audience, flags) {
  if (flags.hard.length) return 'reject';
  if (audience === 'B' && flags.soft.length) return 'quarantine';
  return 'pending';
}

// ---------- Validierung ----------
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function validate(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return { errors: ['body'] };
  const audience = String(body.audience || '').toUpperCase();
  const v = {
    audience,
    name: clean(body.name, 100),
    email: clean(body.email, 254).toLowerCase(),
    machines: clean(body.machines, 20),
    pain: clean(body.pain, 1000),
    src: clean(body.src, 80).replace(/[^\w.\-:/]/g, ''),
    source_app: clean(body.source_app, 40).replace(/[^\w.\-]/g, ''),
    consent: body.consent === true || body.consent === 'on' || body.consent === '1' || body.consent === 'true',
  };
  if (!['A', 'B'].includes(audience)) errors.push('audience');
  if (v.name.length < 2) errors.push('name');
  if (!EMAIL_RE.test(v.email)) errors.push('email');
  if (!v.consent) errors.push('consent');
  if (audience === 'A' && v.machines && !/^\d{1,4}$/.test(v.machines)) errors.push('machines');
  if (audience === 'B' && v.pain.length < 20) errors.push('pain'); // B: Anliegen Pflicht (streng)
  return { errors, value: v };
}

// ---------- Infrastruktur (injizierbar für Tests) ----------
function neonSql(connString, fetchFn) {
  if (!connString) throw new Error('DATABASE_URL fehlt');
  const host = new URL(connString.replace(/^postgres(ql)?:/, 'http:')).hostname;
  const endpoint = 'https://' + host.replace(/^[^.]+\./, 'api.') + '/sql';
  return async (query, params = []) => {
    const r = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connString },
      body: JSON.stringify({ query, params }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('db: ' + (j.message || r.status));
    return j.rows || [];
  };
}

async function verifyTurnstile(token, ip, env, fetchFn) {
  if (env.REQUIRE_TURNSTILE === '0') return { ok: true, skipped: true };
  if (!env.TURNSTILE_SECRET) return { ok: true, skipped: true }; // noch nicht eingerichtet -> nicht erzwungen
  if (!token) return { ok: false, reason: 'turnstile_missing' };
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token).slice(0, 2048) });
  if (ip) form.set('remoteip', ip);
  const r = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!j.success) return { ok: false, reason: 'turnstile_failed', codes: j['error-codes'] };
  const allowed = (env.TURNSTILE_HOSTNAMES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(j.hostname)) return { ok: false, reason: 'turnstile_hostname' };
  return { ok: true };
}

async function hasMx(domain, fetchFn) {
  try {
    const r = await fetchFn(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    const j = await r.json();
    return j.Status === 0 && Array.isArray(j.Answer) && j.Answer.some((a) => a.type === 15);
  } catch (e) {
    return null; // unbekannt -> nicht blockieren, aber als soft-Flag
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendMail(env, fetchFn, { to, subject, html, text, headers }) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('mail not configured');
  const r = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html, text, headers }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('mail: ' + r.status + (j.message ? ' ' + j.message : ''));
  return j.id || null;
}

function confirmMail(env, v, token) {
  const base = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const confirmUrl = `${base}/api/waitlist?confirm=${token}`;
  const unsubUrl = `${base}/api/waitlist?unsubscribe=${token}`;
  const label = v.audience === 'A' ? 'Grok Bot Galaxy (mehrere Agenten-PCs)' : 'ESG-Pilot / Entscheidungsmatrix';
  const text = [
    `Hallo ${v.name},`,
    '',
    `bitte bestätigen Sie Ihre Anmeldung zur Warteliste „${label}“:`,
    confirmUrl,
    '',
    'Der Link ist 48 Stunden gültig. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail – ohne Bestätigung speichern wir nichts dauerhaft und schreiben Ihnen nicht erneut.',
    '',
    `Abmelden: ${unsubUrl}`,
  ].join('\n');
  const html = `<p>Hallo ${esc(v.name)},</p><p>bitte bestätigen Sie Ihre Anmeldung zur Warteliste „${esc(label)}“:</p>`
    + `<p><a href="${esc(confirmUrl)}" style="background:#800020;color:#E8D9B5;padding:10px 18px;text-decoration:none;border-radius:4px">Anmeldung bestätigen</a></p>`
    + '<p>Der Link ist 48 Stunden gültig. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail – ohne Bestätigung speichern wir nichts dauerhaft und schreiben Ihnen nicht erneut.</p>'
    + `<p style="font-size:12px;color:#666"><a href="${esc(unsubUrl)}">Abmelden</a></p>`;
  return {
    to: v.email, subject: 'Bitte bestätigen: Warteliste ROSARY', text, html,
    headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

// ---------- Schema (identisch mit sql/schema.sql) ----------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS waitlist_signups (
    id bigserial PRIMARY KEY, email text NOT NULL UNIQUE,
    audience char(1) NOT NULL CHECK (audience IN ('A','B')), name text NOT NULL, machines integer, pain text, src text, source_app text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','pending_mail','quarantine','confirmed','unsubscribed','mail_failed')),
    token_hash char(64) NOT NULL, ip_hash char(64), flags jsonb NOT NULL DEFAULT '{}'::jsonb, consent_text text, user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, unsubscribed_at timestamptz, pulled_at timestamptz)`,
  `CREATE INDEX IF NOT EXISTS waitlist_signups_token_idx ON waitlist_signups (token_hash)`,
  `CREATE INDEX IF NOT EXISTS waitlist_signups_ip_idx ON waitlist_signups (ip_hash, created_at)`,
  `CREATE INDEX IF NOT EXISTS waitlist_signups_status_idx ON waitlist_signups (status, audience)`,
  `ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS notify_id text`,
  `ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS notify_error text`,
  `ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS token_at timestamptz`,
];

// ---------- HTTP ----------
function reply(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function redirect(res, url) {
  res.statusCode = 303;
  res.setHeader('Location', url);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 16384) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '').trim();
}

const OK_MSG = 'Danke! Bitte bestätige deine Anmeldung über den Link in der E-Mail, die wir dir gerade geschickt haben.';
const PENDING_MAIL_MSG = 'Danke! Du stehst auf der Warteliste. Wir melden uns persönlich.';
const QUAR_MSG = 'Danke! Deine Anmeldung wird kurz manuell geprüft; danach bekommst du eine Bestätigungs-E-Mail.';

function createHandler(deps = {}) {
  const env = deps.env || process.env;
  const fetchFn = deps.fetch || globalThis.fetch;
  const now = deps.now || (() => Date.now());
  const connString = env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL || env.POSTGRES_URL;
  const rawSql = deps.sql || ((q, p) => neonSql(connString, fetchFn)(q, p));
  let ready = null; // Schema einmal pro Instanz anlegen (nur CREATE ... IF NOT EXISTS, nichts anderes wird angefasst)
  const sql = async (q, p) => {
    if (!ready) ready = (async () => { for (const st of SCHEMA) await rawSql(st, []); })().catch((e) => { ready = null; throw e; });
    await ready;
    return rawSql(q, p);
  };
  const mailReady = Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
  // Double-Opt-in nur mit verifizierter Domain: Resend-Sandbox (@resend.dev) stellt nur an die Konto-Adresse zu
  const confirmEnabled = mailReady && !/@resend\.dev>?\s*$/i.test(env.MAIL_FROM || '') && env.CONFIRM_MAIL !== 'off';
  const okMsg = () => (confirmEnabled ? OK_MSG : PENDING_MAIL_MSG);
  const notify = async (subject, text) => {
    if (!env.NOTIFY_EMAIL) return { skipped: 'no NOTIFY_EMAIL' };
    if (!mailReady) { log('notify skipped (kein Mailanbieter)', subject); return { skipped: 'no provider' }; }
    try {
      const id = await sendMail(env, fetchFn, { to: env.NOTIFY_EMAIL, subject, text, html: '<pre>' + esc(text) + '</pre>' });
      log('notify sent', id);
      return { id };
    } catch (e) { log('notify failed', e.message); return { error: e.message }; }
  };
  const isAdmin = (req) => {
    const a = String((req.headers || {})['x-waitlist-admin'] || '');
    const b = String(env.WAITLIST_ADMIN_TOKEN || '');
    return b.length >= 32 && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  };
  const log = deps.log || ((...a) => console.log(...a));
  const memHits = new Map(); // Best-Effort-Limit pro Instanz
  const minFill = Number(env.MIN_FILL_MS || 3000);
  const perHour = Number(env.RATE_LIMIT_PER_HOUR || 5);
  const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

  return async function handler(req, res) {
    const base = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const url = new URL(req.url || '/', 'http://x');
    try {
      const admin = url.searchParams.get('admin');
      if (admin) {
        if (!isAdmin(req)) return reply(res, 404, { ok: false });
        if (req.method === 'GET' && admin === 'stats') {
          const rows = await sql(`SELECT audience, status, count(*)::int AS n FROM waitlist_signups GROUP BY 1,2 ORDER BY 1,2`, []);
          const last = await sql(`SELECT id, audience, status, flags, notify_id, notify_error, created_at, (email LIKE '%@example.com') AS is_test FROM waitlist_signups ORDER BY id DESC LIMIT 5`, []);
          return reply(res, 200, { ok: true, counts: rows, latest: last, mail: mailReady, confirm: confirmEnabled, turnstile: Boolean(env.TURNSTILE_SECRET) });
        }
        if (req.method === 'POST' && admin === 'resend-confirmations') {
          // Für später, wenn eine Absenderdomain verifiziert ist: pending_mail -> neue Tokens + Bestätigungsmail
          if (!confirmEnabled) return reply(res, 409, { ok: false, error: 'Bestätigungsmail deaktiviert (MAIL_FROM ist Sandbox/@resend.dev oder fehlt)' });
          const lim = Math.min(Number(url.searchParams.get('limit') || 50), 200);
          const rows = await sql(`SELECT id, email, audience, name FROM waitlist_signups WHERE status='pending_mail' ORDER BY id LIMIT $1`, [lim]);
          const out = { sent: [], failed: [] };
          for (const r of rows) {
            const tk = crypto.randomBytes(32).toString('hex');
            try {
              await sql(`UPDATE waitlist_signups SET token_hash=$2, token_at=now() WHERE id=$1`, [r.id, hash(tk)]);
              await sendMail(env, fetchFn, confirmMail(env, r, tk));
              await sql(`UPDATE waitlist_signups SET status='pending' WHERE id=$1`, [r.id]);
              out.sent.push(r.id);
            } catch (e) {
              await sql(`UPDATE waitlist_signups SET status='mail_failed' WHERE id=$1`, [r.id]).catch(() => {});
              out.failed.push(r.id);
            }
          }
          return reply(res, 200, { ok: true, ...out });
        }
        if (req.method === 'DELETE' && admin === 'purge-test') {
          const rows = await sql(`DELETE FROM waitlist_signups WHERE email LIKE '%@example.com' RETURNING id`, []);
          return reply(res, 200, { ok: true, deleted: rows.map((r) => r.id) });
        }
        return reply(res, 400, { ok: false });
      }
      if (req.method === 'GET') {
        const confirm = url.searchParams.get('confirm');
        const unsub = url.searchParams.get('unsubscribe');
        const tok = confirm || unsub;
        if (!tok || !/^[a-f0-9]{64}$/.test(tok)) return redirect(res, `${base}/?waitlist=invalid#waitlist`);
        if (confirm) {
          const rows = await sql(
            `UPDATE waitlist_signups SET status='confirmed', confirmed_at=now()
             WHERE token_hash=$1 AND status='pending' AND coalesce(token_at, created_at) > now() - interval '48 hours' RETURNING id`, [hash(tok)]);
          return redirect(res, `${base}/?waitlist=${rows.length ? 'confirmed' : 'expired'}#waitlist`);
        }
        await sql(`UPDATE waitlist_signups SET status='unsubscribed', unsubscribed_at=now() WHERE token_hash=$1`, [hash(tok)]);
        return redirect(res, `${base}/?waitlist=unsubscribed#waitlist`);
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return reply(res, 405, { ok: false }); }

      const ip = clientIp(req);
      const ipHash = hash((env.IP_HASH_SALT || '') + ip);
      // 1) Rate-Limit pro IP (Speicher + DB)
      const t = now();
      const recent = (memHits.get(ipHash) || []).filter((x) => t - x < 3600e3);
      recent.push(t);
      memHits.set(ipHash, recent);
      if (recent.length > perHour) return reply(res, 429, { ok: false, error: 'Zu viele Versuche. Bitte später erneut.' });

      const body = await readBody(req);
      if (!body) return reply(res, 400, { ok: false, error: 'Ungültige Anfrage.' });

      // 2) Honeypot + Mindest-Ausfüllzeit -> stilles Verwerfen (Bot bekommt Erfolg vorgespielt)
      const started = Number(body.ts || 0);
      const tooFast = !started || t - started < minFill || t - started > 24 * 3600e3;
      if ((body.website && String(body.website).trim()) || tooFast) {
        log('waitlist drop', { reason: body.website ? 'honeypot' : 'timing' });
        return reply(res, 200, { ok: true, message: okMsg() });
      }

      // 3) Validierung
      const { errors, value: v } = validate(body);
      if (errors.length) return reply(res, 400, { ok: false, error: 'Bitte Eingaben prüfen.', fields: errors });

      // 4) Turnstile
      const ts = await verifyTurnstile(body['cf-turnstile-response'] || body.turnstile, ip, env, fetchFn);
      if (!ts.ok) return reply(res, 400, { ok: false, error: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.', reason: ts.reason });

      // 5) Spam-/Scam-Analyse + MX
      const flags = analyze(v);
      const mx = await hasMx(v.email.split('@')[1], fetchFn);
      if (mx === false) flags.hard.push('no_mx');
      if (mx === null) flags.soft.push('mx_unknown');
      const decision = decide(v.audience, flags);
      if (decision === 'reject') {
        log('waitlist reject', { audience: v.audience, flags });
        return reply(res, 200, { ok: true, message: okMsg() }); // nichts speichern, nichts senden
      }

      // 6) DB-Rate-Limit + Speichern
      const cnt = await sql(`SELECT count(*)::int AS n FROM waitlist_signups WHERE ip_hash=$1 AND created_at > now() - interval '1 hour'`, [ipHash]);
      if (cnt[0] && cnt[0].n >= perHour) return reply(res, 429, { ok: false, error: 'Zu viele Versuche. Bitte später erneut.' });

      const token = crypto.randomBytes(32).toString('hex');
      const status = decision === 'quarantine' ? 'quarantine' : (confirmEnabled ? 'pending' : 'pending_mail');
      const ins = await sql(
        `INSERT INTO waitlist_signups (email, audience, name, machines, pain, src, source_app, status, token_hash, ip_hash, flags, consent_text, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [v.email, v.audience, v.name, v.machines ? Number(v.machines) : null, v.pain || null, v.src || null,
          v.source_app || null, status, hash(token), ipHash, JSON.stringify(flags), 'Warteliste + Datenschutz akzeptiert (Lander)',
          clean((req.headers || {})['user-agent'], 200)]);
      if (!ins.length) return reply(res, 200, { ok: true, message: okMsg() }); // schon vorhanden: keine Enumeration

      const nres = await notify(
        status === 'quarantine' ? `Warteliste ${v.audience}: manuelle Prüfung (#${ins[0].id})` : `Warteliste ${v.audience}: neue Anmeldung (#${ins[0].id})`,
        `Zielgruppe: ${v.audience}\nName: ${v.name}\nE-Mail: ${v.email}\nRechner: ${v.machines || '-'}\nAnliegen: ${v.pain || '-'}\nQuelle: ${v.src || '-'}\nStatus: ${status}\nFlags: ${[...flags.hard, ...flags.soft].join(', ') || '-'}`);
      if (nres.id || nres.error) {
        await sql(`UPDATE waitlist_signups SET notify_id=$2, notify_error=$3 WHERE id=$1`, [ins[0].id, nres.id || null, nres.error || null])
          .catch((e) => log('notify store failed', e.message));
      }
      if (status === 'quarantine') return reply(res, 200, { ok: true, message: confirmEnabled ? QUAR_MSG : PENDING_MAIL_MSG });
      if (status === 'pending_mail') return reply(res, 200, { ok: true, message: PENDING_MAIL_MSG });

      // 7) Double-Opt-in-Mail
      try {
        await sendMail(env, fetchFn, confirmMail(env, v, token));
      } catch (e) {
        log('mail failed', e.message);
        await sql(`UPDATE waitlist_signups SET status='mail_failed' WHERE id=$1`, [ins[0].id]);
        return reply(res, 502, { ok: false, error: 'Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.' });
      }
      return reply(res, 200, { ok: true, message: OK_MSG });
    } catch (e) {
      log('waitlist error', e && e.message);
      return reply(res, 500, { ok: false, error: 'Die Warteliste ist gerade nicht erreichbar.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports._internal = { analyze, decide, validate, neonSql, verifyTurnstile, hasMx, confirmMail, DISPOSABLE, KEYWORDS };
