import { motion } from 'framer-motion';
import type { Bet, BetType } from '../types';
import { BOOK_ACCENT, BOOK_LABELS, BET_TYPE_LABELS } from '../types';
import { aggregate, statsByBook, signedMoney, money, pct } from '../stats';

export function Stats({ bets }: { bets: Bet[] }) {
  const overall = aggregate(bets);
  const byBook = statsByBook(bets);

  const maxAbs = Math.max(1, ...byBook.map((b) => Math.abs(b.stats.netProfit)));

  const types = Array.from(new Set(bets.map((b) => b.betType)));
  const byType = types
    .map((t) => ({ type: t as BetType, stats: aggregate(bets.filter((b) => b.betType === t)) }))
    .sort((a, b) => b.stats.count - a.stats.count);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Stats</h1>
      </div>

      <div className="tile-grid" style={{ marginTop: 4 }}>
        <div className="tile">
          <div className="k">Net profit</div>
          <div className={`v ${overall.netProfit >= 0 ? 'pos' : 'neg'}`}>
            {signedMoney(overall.netProfit)}
          </div>
        </div>
        <div className="tile">
          <div className="k">ROI</div>
          <div className={`v ${overall.roi >= 0 ? 'pos' : 'neg'}`}>{pct(overall.roi)}</div>
        </div>
        <div className="tile">
          <div className="k">Win rate</div>
          <div className="v">{pct(overall.winRate)}</div>
        </div>
        <div className="tile">
          <div className="k">Total staked</div>
          <div className="v">{money(overall.totalStaked)}</div>
        </div>
      </div>

      <div className="section-head">
        <h2>Profit by book</h2>
      </div>
      {byBook.map(({ book, stats }, i) => {
        const width = `${(Math.abs(stats.netProfit) / maxAbs) * 100}%`;
        return (
          <div className="card" key={book}>
            <div className="row" style={{ padding: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <span className="book-dot" style={{ background: BOOK_ACCENT[book] }} />
                {BOOK_LABELS[book]}
              </span>
              <span className={`v ${stats.netProfit >= 0 ? 'pos' : 'neg'}`}
                style={{ color: stats.netProfit >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                {signedMoney(stats.netProfit)}
              </span>
            </div>
            <div className="bar-track">
              <motion.div
                className="bar-fill"
                initial={{ width: 0 }}
                animate={{ width }}
                transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 120, damping: 20 }}
                style={{
                  background: stats.netProfit >= 0 ? 'var(--pos)' : 'var(--neg)',
                }}
              />
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              {stats.count} bets · {pct(stats.winRate)} win · {pct(stats.roi)} ROI
            </div>
          </div>
        );
      })}

      <div className="section-head">
        <h2>By bet type</h2>
      </div>
      <div className="card">
        {byType.map(({ type, stats }) => (
          <div className="row" key={type}>
            <span className="k">{BET_TYPE_LABELS[type]}</span>
            <span className="v" style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                {stats.count} bets
              </span>
              <span style={{ color: stats.netProfit >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                {signedMoney(stats.netProfit)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
