'use strict';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    text: 'Statischer Fallback. Setze XAI_API_KEY im Vercel-Projekt, wenn der Bot live antworten soll.',
  }));
};
