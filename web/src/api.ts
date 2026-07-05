import type { Bet } from './types';

/**
 * Persistence. One switch decides where bets live:
 *
 *   USE_LOCAL = true   -> browser localStorage (static build; your bets persist
 *                         on the device). Starts empty — you add your own bets.
 *   USE_LOCAL = false  -> the Express backend (SQLite) via /api/bets.
 *
 * Defaults to local so the static build works with no backend. Set
 * VITE_USE_MOCK=false to run against the local API.
 */
export const USE_LOCAL = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

const LS_KEY = 'pf-bets';

function readLocal(): Bet[] {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Bet[];
  } catch {
    return [];
  }
}

function writeLocal(bets: Bet[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(bets));
}

export async function loadBets(): Promise<Bet[]> {
  if (USE_LOCAL) return readLocal();
  const res = await fetch('/api/bets');
  if (!res.ok) throw new Error(`Failed to load bets (${res.status})`);
  const body = (await res.json()) as { bets: Bet[] };
  return body.bets;
}

export async function saveBet(bet: Bet): Promise<void> {
  if (USE_LOCAL) {
    const bets = readLocal().filter((b) => !(b.book === bet.book && b.betId === bet.betId));
    writeLocal([bet, ...bets]);
    return;
  }
  const res = await fetch('/api/bets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bet),
  });
  if (!res.ok) throw new Error(`Failed to save bet (${res.status})`);
}

export async function removeBet(book: string, betId: string): Promise<void> {
  if (USE_LOCAL) {
    writeLocal(readLocal().filter((b) => !(b.book === book && b.betId === betId)));
    return;
  }
  const res = await fetch(`/api/bets/${book}/${betId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete bet (${res.status})`);
}
