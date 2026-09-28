'use strict';

const MODEL = 'grok-4.7';
const MAX_MESSAGES = 8;
const MAX_CHARS = 1500;

const SYSTEM = [
  'You are Grok, explaining the public page https://hmpsm-lander5787.vercel.app/ in true words.',
  'Answer in the language of the latest user message. Be plain. Do not sell.',
  'This page is a static HTML monitor for ROSARY Bio 2.0 on Vercel project hmpsm-lander5787.',
  'Separate three kinds of statement and never promote one into another:',
  '1. Page fallback constants, used when /rosary-atlas/ JSON is missing: esg_carbon 0.9412, aggregate_stability 0.9381, vertical_thesis 0.95, social_policy 0.915, soil_dhg_tpf 153.1 mg/10g, tomato_kg 41.006 kg/bed, and the NS watch numerical_ns_blowup with the large E, Omega, and BKM figures baked into the script.',
  '2. Live readings, only if the browser actually loaded /rosary-atlas/gov_telemetry.json or vault-graph.json. If you cannot see that fetch, say the card may still be showing the fallback.',
  '3. Author claims and marketing lines on the page. The page itself says eta_raw=30000 is AUTHOR_CLAIM and is not an enzyme TTC/TPF result. The NS flag is a numerical blow-up watch on a spectral RK2 stepper, and the page says it is not a Clay proof. TRL 9, bankable ESG asset class, and the Bio 1.0 / Tech-Bio 2.0 cards are statements printed on the page, not monitor readings.',
  'Do not invent measurements, court holdings, or certificates. If a figure is not in the list above, say the page does not establish it.',
].join(' ');

function reply(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); }
    catch (err) { return Promise.resolve(null); }
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (err) { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

function outputText(data) {
  if (data && typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  const output = data && Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = item && Array.isArray(item.content) ? item.content : [];
    for (const block of content) {
      if (block && block.type === 'output_text' && typeof block.text === 'string') {
        parts.push(block.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const cleaned = [];
  for (const item of raw) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant')) continue;
    if (typeof item.content !== 'string') continue;
    const content = item.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    cleaned.push({ role: item.role, content: content });
  }
  return cleaned.slice(-MAX_MESSAGES);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    reply(res, 405, { error: 'POST only' });
    return;
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    reply(res, 503, { error: 'XAI_API_KEY is not set on this Vercel project.' });
    return;
  }

  const body = await readBody(req);
  const messages = cleanMessages(body && body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    reply(res, 400, { error: 'Send messages ending with a user turn.' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: [{ role: 'system', content: SYSTEM }].concat(messages),
      }),
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const detail = data && (data.error && data.error.message || data.message);
      reply(res, 502, { error: detail || ('x.ai HTTP ' + upstream.status) });
      return;
    }
    const text = outputText(data);
    if (!text) {
      reply(res, 502, { error: 'Grok returned no text.' });
      return;
    }
    reply(res, 200, { text: text, model: MODEL });
  } catch (err) {
    const message = err && err.name === 'AbortError' ? 'Grok took too long.' : 'Grok request failed.';
    reply(res, 502, { error: message });
  } finally {
    clearTimeout(timer);
  }
};
