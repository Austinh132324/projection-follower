import type { Bet } from './types';
import { MOCK_BETS } from './mock';

/**
 * Persistence. One switch decides where bets live:
 *
 *   USE_MOCK = true   -> browser localStorage (static GitHub Pages; seeded once
 *                        with demo data). Your hand-entered / photo bets persist
 *                        on the device.
 *   USE_MOCK = false  -> the Express backend (SQLite) via /api/bets.
 *
 * Defaults to mock so the Pages build works with no backend. Set
 * VITE_USE_MOCK=false to run against the local API.
 */
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

const LS_KEY = 'pf-bets';

function readLocal(): Bet[] {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Bet[];
    } catch {
      /* fall through to seed */
    }
  }
  // First run: seed with the demo bets so the app isn't empty.
  localStorage.setItem(LS_KEY, JSON.stringify(MOCK_BETS));
  return MOCK_BETS;
}

function writeLocal(bets: Bet[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(bets));
}

export async function loadBets(): Promise<Bet[]> {
  if (USE_MOCK) return readLocal();
  const res = await fetch('/api/bets');
  if (!res.ok) throw new Error(`Failed to load bets (${res.status})`);
  const body = (await res.json()) as { bets: Bet[] };
  return body.bets;
}

export async function saveBet(bet: Bet): Promise<void> {
  if (USE_MOCK) {
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
  if (USE_MOCK) {
    writeLocal(readLocal().filter((b) => !(b.book === book && b.betId === betId)));
    return;
  }
  const res = await fetch(`/api/bets/${book}/${betId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete bet (${res.status})`);
}

/** Reset local demo data back to the seed (mock mode only). */
export function resetLocal(): void {
  if (USE_MOCK) writeLocal(MOCK_BETS);
}
