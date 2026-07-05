// Client-side filtering + aggregation. Shared verbatim with the web app
// (web/src/stats.ts): ROI / win-rate / exposure recomputed reactively.

import type { Bet, Filter, Book } from './types';

export function netProfit(bet: Bet): number {
  if (bet.status !== 'settled' || bet.payout === null) return 0;
  return bet.payout - bet.stake;
}

function isGraded(bet: Bet): boolean {
  return bet.status === 'settled' && (bet.result === 'win' || bet.result === 'loss');
}

export function applyFilter(bets: Bet[], filter: Filter): Bet[] {
  return bets.filter((b) => {
    if (filter.books.length && !filter.books.includes(b.book)) return false;
    if (filter.status !== 'all' && b.status !== filter.status) return false;
    if (filter.betType !== 'all' && b.betType !== filter.betType) return false;
    return true;
  });
}

export interface Stats {
  count: number;
  settledCount: number;
  openCount: number;
  totalStaked: number;
  netProfit: number;
  roi: number;
  winRate: number;
  openExposure: number;
}

export function aggregate(bets: Bet[]): Stats {
  let settledCount = 0;
  let openCount = 0;
  let totalStaked = 0;
  let settledStake = 0;
  let net = 0;
  let wins = 0;
  let graded = 0;
  let exposure = 0;

  for (const bet of bets) {
    totalStaked += bet.stake;
    if (bet.status === 'open') {
      openCount += 1;
      exposure += bet.stake;
    } else {
      settledCount += 1;
      settledStake += bet.stake;
      net += netProfit(bet);
      if (isGraded(bet)) {
        graded += 1;
        if (bet.result === 'win') wins += 1;
      }
    }
  }

  return {
    count: bets.length,
    settledCount,
    openCount,
    totalStaked,
    netProfit: net,
    roi: settledStake > 0 ? net / settledStake : 0,
    winRate: graded > 0 ? wins / graded : 0,
    openExposure: exposure,
  };
}

export function statsByBook(bets: Bet[]): { book: Book; stats: Stats }[] {
  const books = Array.from(new Set(bets.map((b) => b.book)));
  return books
    .map((book) => ({ book, stats: aggregate(bets.filter((b) => b.book === book)) }))
    .sort((a, b) => b.stats.netProfit - a.stats.netProfit);
}

// --- formatting helpers ------------------------------------------------------

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function signedMoney(n: number): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function americanOdds(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
