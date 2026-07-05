import { motion } from 'framer-motion';
import type { Bet, Filter, Book, BetType, BetStatus } from '../types';
import { BOOK_LABELS, BET_TYPE_LABELS } from '../types';
import { applyFilter, aggregate, signedMoney } from '../stats';
import { BetCard } from '../components/BetCard';

const BOOKS: Book[] = ['draftkings', 'fanduel', 'prizepicks', 'other'];
const STATUSES: (BetStatus | 'all')[] = ['all', 'open', 'settled'];
const TYPES: (BetType | 'all')[] = ['all', 'single', 'parlay', 'prop', 'dfs_entry'];

export function Bets({
  bets,
  filter,
  setFilter,
  onOpen,
}: {
  bets: Bet[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onOpen: (b: Bet) => void;
}) {
  const filtered = applyFilter(bets, filter);
  const stats = aggregate(filtered);

  const toggleBook = (book: Book) => {
    const books = filter.books.includes(book)
      ? filter.books.filter((b) => b !== book)
      : [...filter.books, book];
    setFilter({ ...filter, books });
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="eyebrow">
            {filtered.length} bets · {signedMoney(stats.netProfit)}
          </div>
          <h1 className="screen-title">Bets</h1>
        </div>
      </div>

      <div className="filter-label">Book</div>
      <div className="chip-row">
        <Chip label="All" active={filter.books.length === 0} onClick={() => setFilter({ ...filter, books: [] })} />
        {BOOKS.map((b) => (
          <Chip key={b} label={BOOK_LABELS[b]} active={filter.books.includes(b)} onClick={() => toggleBook(b)} />
        ))}
      </div>

      <div className="filter-label">Status</div>
      <div className="chip-row">
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={s === 'all' ? 'All' : s === 'open' ? 'Open' : 'Settled'}
            active={filter.status === s}
            onClick={() => setFilter({ ...filter, status: s })}
          />
        ))}
      </div>

      <div className="filter-label">Type</div>
      <div className="chip-row">
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={t === 'all' ? 'All' : BET_TYPE_LABELS[t]}
            active={filter.betType === t}
            onClick={() => setFilter({ ...filter, betType: t })}
          />
        ))}
      </div>

      <div style={{ height: 18 }} />

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="big">🎯</div>
          No bets match these filters.
        </div>
      ) : (
        <motion.div layout>
          {filtered.map((bet, i) => (
            <BetCard bet={bet} index={i} onOpen={onOpen} key={`${bet.book}-${bet.betId}`} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button className={`chip ${active ? 'active' : ''}`} onClick={onClick} whileTap={{ scale: 0.92 }}>
      {label}
    </motion.button>
  );
}
