import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Bet } from '../types';
import { BOOK_ACCENT, BOOK_LABELS, BET_TYPE_LABELS } from '../types';
import { netProfit, signedMoney, money, americanOdds, formatDate } from '../stats';

export function BetCard({ bet, index }: { bet: Bet; index: number }) {
  const [open, setOpen] = useState(false);
  const accent = BOOK_ACCENT[bet.book];

  const headline = bet.legs[0]?.selection ?? `${BET_TYPE_LABELS[bet.betType]}`;
  const subtitle =
    bet.legs.length > 1
      ? `${BET_TYPE_LABELS[bet.betType]} · ${bet.legs.length} legs`
      : (bet.legs[0]?.market ?? BET_TYPE_LABELS[bet.betType]);

  const net = netProfit(bet);
  const amountClass =
    bet.status === 'open'
      ? ''
      : bet.result === 'win'
        ? 'pos'
        : bet.result === 'loss'
          ? 'neg'
          : 'push';
  const amountText =
    bet.status === 'open' ? `${money(bet.stake)} → ${money(bet.potentialPayout)}` : signedMoney(net);

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
      <motion.button className="bet-card-head" onClick={() => setOpen((v) => !v)} whileTap={{ scale: 0.985 }}>
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="legs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="bet-legs">
              {bet.legs.map((leg) => (
                <div className="leg" key={leg.id}>
                  <span className={`leg-marker ${leg.result ?? ''}`} />
                  <div style={{ minWidth: 0 }}>
                    <div className="sel">{leg.selection}</div>
                    <div className="mkt">
                      {[leg.market, leg.event].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {leg.oddsAmerican != null && (
                    <span className="odds">{americanOdds(leg.oddsAmerican)}</span>
                  )}
                </div>
              ))}
              <div className="leg" style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', width: '100%' }}>
                  <Meta k="Stake" v={money(bet.stake)} />
                  <Meta k={bet.status === 'open' ? 'To Win' : 'Payout'}
                    v={money(bet.status === 'open' ? bet.potentialPayout : (bet.payout ?? 0))} />
                  {bet.oddsAmerican != null && <Meta k="Odds" v={americanOdds(bet.oddsAmerican)} />}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>{k}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
    </div>
  );
}
