import { getStore } from '@netlify/blobs';

const STORE_NAME = 'leaderboard';
const SCORE_KEY  = 'scores';
const MAX_SCORES = 10;
const MAX_NAME   = 30;
const MAX_DIST   = 1_000_000; // sanity cap (1000 km)

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const store = getStore(STORE_NAME);

  // ── GET ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await store.get(SCORE_KEY, { type: 'json' });
      return Response.json(data ?? [], { headers });
    } catch {
      return Response.json([], { headers });
    }
  }

  // ── POST ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers });
    }

    const { name, distance } = body;

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      typeof distance !== 'number' ||
      !isFinite(distance)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers });
    }

    // Sanitise
    const safeName = name.trim().slice(0, MAX_NAME).replace(/[<>&"']/g, '');
    const safeDist = Math.max(0, Math.min(MAX_DIST, Math.round(distance)));

    let scores = [];
    try {
      scores = (await store.get(SCORE_KEY, { type: 'json' })) ?? [];
    } catch { /* first score ever */ }

    scores.push({ name: safeName, distance: safeDist, date: new Date().toISOString() });
    scores.sort((a, b) => b.distance - a.distance);
    const top = scores.slice(0, MAX_SCORES);

    await store.set(SCORE_KEY, JSON.stringify(top));
    return Response.json(top, { headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};

export const config = { path: '/api/leaderboard' };
