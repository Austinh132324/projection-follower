import type { Bet } from './types';
import { MOCK_BETS } from './mock';

/**
 * Data layer. One switch decides where bets come from:
 *
 *   USE_MOCK = true   -> bundled mock data (static GitHub Pages, no backend)
 *   USE_MOCK = false  -> GET /api/bets from the real Express server
 *
 * Defaults to mock so the Pages build "just works". Set VITE_USE_MOCK=false when
 * running against the local backend (`npm run web:dev` with the API up).
 *
 * All filtering + stats happen client-side (see stats.ts), so both paths return
 * the same thing: a flat list of bets.
 */
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export async function fetchBets(): Promise<Bet[]> {
  if (USE_MOCK) {
    // Simulate a little latency so loading states are exercised in the demo.
    await new Promise((r) => setTimeout(r, 250));
    return MOCK_BETS;
  }
  const res = await fetch('/api/bets');
  if (!res.ok) throw new Error(`Failed to load bets (${res.status})`);
  const body = (await res.json()) as { bets: Bet[] };
  return body.bets;
}

export async function triggerSync(): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
  const res = await fetch('/api/sync', { method: 'POST' });
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
}
