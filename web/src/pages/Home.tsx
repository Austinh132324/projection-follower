import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { BOOK_ACCENT, BOOK_LABELS } from '../types';
import { aggregate, statsByBook, signedMoney, money, pct } from '../stats';
import { BetCard } from '../components/BetCard';
import { PlusIcon, LogoBadge } from '../components/icons';
import type { Tab } from '../components/BottomNav';

export function Home({
  bets,
  onSeeAll,
  onOpen,
  onAdd,
}: {
  bets: Bet[];
  onSeeAll: (t: Tab) => void;
  onOpen: (b: Bet) => void;
  onAdd: () => void;
}) {
  if (bets.length === 0) {
    return (
      <div className="screen">
        <div className="screen-header">
          <div className="brand-row">
            <LogoBadge size={34} />
            <h1 className="screen-title">Dashboard</h1>
          </div>
        </div>
        <div className="empty" style={{ paddingTop: 90 }}>
          <div className="big">📈</div>
          <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', margin: '4px 0 4px' }}>
            No bets yet
          </p>
          <motion.button className="btn" style={{ maxWidth: 220, margin: '18px auto 0' }}
            onClick={onAdd} whileTap={{ scale: 0.97 }}>
            <PlusIcon size={20} /> Add a bet
          </motion.button>
        </div>
      </div>
    );
  }

  const stats = aggregate(bets);
  const byBook = statsByBook(bets);
  const recent = [...bets].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 4);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="brand-row">
          <LogoBadge size={34} />
          <h1 className="screen-title">Dashboard</h1>
        </div>
      </div>

      <motion.div
        className="hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="eyebrow">Net profit / loss</div>
        <div className={`hero-value ${stats.netProfit >= 0 ? 'pos' : 'neg'}`}>
          {signedMoney(stats.netProfit)}
        </div>
        <div className="hero-meta">
          <div>
            <span className="k">ROI</span>
            <span className="v">{pct(stats.roi)}</span>
          </div>
          <div>
            <span className="k">Win rate</span>
            <span className="v">{pct(stats.winRate)}</span>
          </div>
          <div>
            <span className="k">Settled</span>
            <span className="v">{stats.settledCount}</span>
          </div>
        </div>
      </motion.div>

      <div className="tile-grid">
        <Tile k="Total staked" v={money(stats.totalStaked)} />
        <Tile k="Open exposure" v={money(stats.openExposure)} />
        <Tile k="Open bets" v={String(stats.openCount)} />
        <Tile k="Total bets" v={String(stats.count)} />
      </div>

      <div className="section-head">
        <h2>By book</h2>
      </div>
      {byBook.map(({ book, stats: s }) => (
        <div className="book-row" key={book}>
          <span className="book-dot" style={{ background: BOOK_ACCENT[book] }} />
          <div>
            <div className="name">{BOOK_LABELS[book]}</div>
            <div className="sub">
              {s.count} bets · {pct(s.winRate)} win
            </div>
          </div>
          <div className="right">
            <div className={`amt ${s.netProfit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(s.netProfit)}</div>
            <div className="roi">{pct(s.roi)} ROI</div>
          </div>
        </div>
      ))}

      <div className="section-head">
        <h2>Recent</h2>
        <button className="link" onClick={() => onSeeAll('bets')}>
          See all
        </button>
      </div>
      {recent.map((bet, i) => (
        <BetCard bet={bet} index={i} onOpen={onOpen} key={`${bet.book}-${bet.betId}`} />
      ))}
    </div>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
