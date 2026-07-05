// Persistence. The native app mirrors the web app's local-storage mode: bets
// live on the device via AsyncStorage. Starts empty — you add your own bets.
// (The web app can also talk to an Express/SQLite backend; the mobile app is
// device-local only, which matches the "your bets, your phone" model.)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bet } from './types';

const LS_KEY = 'pf-bets';

// Old web builds seeded demo bets (ids like dk-1001 / fd-2001 / pp-3001). Real
// bets you add get "m-…" ids, so purge any leftover seed rows once, on load.
const DEMO_SEED = /^(dk|fd|pp)-\d/;

async function readLocal(): Promise<Bet[]> {
  const raw = await AsyncStorage.getItem(LS_KEY);
  if (!raw) return [];
  try {
    const bets = JSON.parse(raw) as Bet[];
    const cleaned = bets.filter((b) => !DEMO_SEED.test(b.betId));
    if (cleaned.length !== bets.length) await writeLocal(cleaned);
    return cleaned;
  } catch {
    return [];
  }
}

async function writeLocal(bets: Bet[]): Promise<void> {
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(bets));
}

export async function loadBets(): Promise<Bet[]> {
  return readLocal();
}

export async function saveBet(bet: Bet): Promise<void> {
  const bets = (await readLocal()).filter((b) => !(b.book === bet.book && b.betId === bet.betId));
  await writeLocal([bet, ...bets]);
}

export async function removeBet(book: string, betId: string): Promise<void> {
  const bets = (await readLocal()).filter((b) => !(b.book === book && b.betId === betId));
  await writeLocal(bets);
}
