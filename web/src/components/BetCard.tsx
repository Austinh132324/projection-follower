import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { BOOK_ACCENT, BOOK_LABELS, BET_TYPE_LABELS } from '../types';
import { netProfit, signedMoney, money, formatDate } from '../stats';

export function BetCard({ bet, index, onOpen }: { bet: Bet; index: number; onOpen: (b: Bet) => void }) {
  const accent = BOOK_ACCENT[bet.book];
  const headline = bet.legs[0]?.selection ?? BET_TYPE_LABELS[bet.betType];
  const subtitle =
    bet.legs.length > 1
      ? `${BET_TYPE_LABELS[bet.betType]} · ${bet.legs.length} legs`
      : (bet.legs[0]?.market ?? BET_TYPE_LABELS[bet.betType]);

  const net = netProfit(bet);
  const amountClass =
    bet.status === 'open' ? '' : bet.result === 'win' ? 'pos' : bet.result === 'loss' ? 'neg' : 'push';
  const amountText = bet.status === 'open' ? `${money(bet.stake)} → ${money(bet.potentialPayout)}` : signedMoney(net);
  const pillClass = bet.status === 'open' ? 'open' : (bet.result ?? 'push');
  const pillText = bet.status === 'open' ? 'Open' : (bet.result ?? 'settled');

  return (
    <motion.div
      className="bet-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.35), type: 'spring', stiffness: 320, damping: 30 }}
      layout
    >
      <motion.button className="bet-card-head" onClick={() => onOpen(bet)} whileTap={{ scale: 0.985 }}>
        <span className="book-dot" style={{ background: accent }} />
        <div style={{ minWidth: 0 }}>
          <div className="bet-title">{headline}</div>
          <div className="bet-subtitle">
            {BOOK_LABELS[bet.book]} · {subtitle} · {formatDate(bet.placedAt)}
          </div>
        </div>
        <div className="bet-right">
          <div className={`bet-amount ${amountClass}`}>{amountText}</div>
          <span className={`status-pill ${pillClass}`}>{pillText}</span>
        </div>
      </motion.button>
    </motion.div>
  );
}
