import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Bet } from '../types';
import { BOOK_LABELS, BOOK_ACCENT, BET_TYPE_LABELS } from '../types';
import { netProfit, signedMoney, money, americanOdds, formatDate } from '../stats';
import { assessBet, type EspnInsight } from '../espn';
import { CloseIcon, TrashIcon } from './icons';
import { KickoffCard, WinProbChart, LinescoreTable } from './GameViews';

export function BetDetail({
  bet,
  onClose,
  onDelete,
}: {
  bet: Bet;
  onClose: () => void;
  onDelete: (bet: Bet) => void;
}) {
  const [insight, setInsight] = useState<EspnInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    assessBet(bet)
      .then((i) => alive && setInsight(i))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bet]);

  const net = netProfit(bet);

  return (
    <motion.div className="modal" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}>
      <div className="modal-inner">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="book-dot" style={{ background: BOOK_ACCENT[bet.book] }} />
            <h2>{BOOK_LABELS[bet.book]}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Bet summary */}
        <div className="hero" style={{ marginBottom: 14 }}>
          <div className="eyebrow">
            {BET_TYPE_LABELS[bet.betType]} · {formatDate(bet.placedAt)}
          </div>
          {bet.status === 'open' ? (
            <>
              <div className="hero-value">{money(bet.potentialPayout)}</div>
              <div className="eyebrow" style={{ marginTop: 2 }}>Potential payout · {money(bet.stake)} staked</div>
            </>
          ) : (
            <>
              <div className={`hero-value ${net >= 0 ? 'pos' : 'neg'}`}>{signedMoney(net)}</div>
              <div className="eyebrow" style={{ marginTop: 2 }}>
                {bet.result?.toUpperCase()} · {money(bet.stake)} → {money(bet.payout ?? 0)}
              </div>
            </>
          )}
        </div>

        {/* Legs */}
        <div className="bet-legs" style={{ border: '1px solid var(--border)', borderRadius: 14, marginBottom: 14, padding: '4px 14px 10px' }}>
          {bet.legs.map((leg) => (
            <div className="leg" key={leg.id}>
              <span className={`leg-marker ${leg.result ?? ''}`} />
              <div style={{ minWidth: 0 }}>
                <div className="sel">{leg.selection}</div>
                <div className="mkt">{[leg.market, leg.event].filter(Boolean).join(' · ')}</div>
              </div>
              {leg.oddsAmerican != null && <span className="odds">{americanOdds(leg.oddsAmerican)}</span>}
            </div>
          ))}
        </div>

        {/* ESPN insight */}
        <div className="section-head" style={{ marginTop: 6 }}>
          <h2 style={{ fontSize: 15 }}>
            {insight?.event?.state === 'pre' ? 'Matchup' : insight?.event?.state === 'in' ? 'Live' : 'Game'} &amp; research
          </h2>
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>via ESPN</span>
        </div>

        {loading && <div className="spinner" />}

        {!loading && insight && !insight.matched && (
          <div className="note">{insight.error ?? 'No matching ESPN game found.'}</div>
        )}

        {!loading && insight?.matched && insight.event && (
          <>
            {insight.event.state === 'pre' ? (
              <KickoffCard event={insight.event} prediction={insight.prediction} />
            ) : (
              <>
                <Scorebug insight={insight} />
                {insight.event.state === 'in' && insight.winProbTimeline && (
                  <WinProbChart
                    timeline={insight.winProbTimeline}
                    homeAbbr={insight.event.competitors.find((c) => c.homeAway === 'home')?.abbreviation ?? 'HOME'}
                    awayAbbr={insight.event.competitors.find((c) => c.homeAway === 'away')?.abbreviation ?? 'AWAY'}
                  />
                )}
                <LinescoreTable event={insight.event} />
              </>
            )}
            {insight.prediction && <PredictionCard insight={insight} />}
            {insight.odds && <OddsCard insight={insight} />}
            <p className="note">Estimate for research — not betting advice.</p>
          </>
        )}

        <motion.button className="btn secondary danger" style={{ marginTop: 22 }} whileTap={{ scale: 0.97 }}
          onClick={() => onDelete(bet)}>
          <TrashIcon size={18} /> Delete bet
        </motion.button>
      </div>
    </motion.div>
  );
}

function Scorebug({ insight }: { insight: EspnInsight }) {
  const ev = insight.event!;
  const away = ev.competitors.find((c) => c.homeAway === 'away');
  const home = ev.competitors.find((c) => c.homeAway === 'home');
  const live = ev.state === 'in';
  return (
    <div className="scorebug">
      <div className="team away">
        <span className="score">{away?.score ?? '–'}</span>
        <span className="abbr">{away?.abbreviation}</span>
      </div>
      <div className="mid">
        <div className="state">
          {live && <span className="live-dot" />}
          {ev.state === 'pre' ? 'Upcoming' : ev.state === 'in' ? 'Live' : 'Final'}
        </div>
        <div className="detail">{ev.statusDetail || formatDate(ev.date)}</div>
      </div>
      <div className="team home">
        <span className="abbr">{home?.abbreviation}</span>
        <span className="score">{home?.score ?? '–'}</span>
      </div>
    </div>
  );
}

function OddsCard({ insight }: { insight: EspnInsight }) {
  const o = insight.odds!;
  const ev = insight.event!;
  const away = ev.competitors.find((c) => c.homeAway === 'away');
  const home = ev.competitors.find((c) => c.homeAway === 'home');
  return (
    <div className="card">
      <div className="row" style={{ paddingTop: 0 }}>
        <span className="k">Vegas odds</span>
        <span className="v" style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>{o.provider}</span>
      </div>
      {o.details && (
        <div className="row">
          <span className="k">Spread</span>
          <span className="v">{o.details}</span>
        </div>
      )}
      {o.overUnder != null && (
        <div className="row">
          <span className="k">Total</span>
          <span className="v">{o.overUnder}</span>
        </div>
      )}
      {o.awayMoneyline != null && (
        <div className="row">
          <span className="k">{away?.abbreviation} moneyline</span>
          <span className="v">{americanOdds(o.awayMoneyline)}</span>
        </div>
      )}
      {o.homeMoneyline != null && (
        <div className="row">
          <span className="k">{home?.abbreviation} moneyline</span>
          <span className="v">{americanOdds(o.homeMoneyline)}</span>
        </div>
      )}
    </div>
  );
}

function PredictionCard({ insight }: { insight: EspnInsight }) {
  const p = insight.prediction!;
  const pct = p.researchWinPct;
  return (
    <div className="predict">
      <div className="predict-head">
        <span className="title">Win likelihood</span>
        <span className={`conf ${p.confidence}`}>{p.confidence} confidence</span>
      </div>

      {pct != null ? (
        <>
          <div className="gauge">
            <span className="big">{pct.toFixed(0)}%</span>
            <span className="lbl">
              {p.side ?? 'projected side'} to win
              {p.researchFairOdds != null && (
                <>
                  <br />
                  <b style={{ color: 'var(--text)' }}>≈ {americanOdds(p.researchFairOdds)} fair line</b>
                </>
              )}
            </span>
          </div>
          <div className="meter">
            <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
          </div>
        </>
      ) : (
        <div className="lbl" style={{ color: 'var(--muted)' }}>No model projection available yet.</div>
      )}

      {p.marketImpliedPct != null && (
        <div className="edge-row">
          <div className="edge-box">
            <div className="k">Research</div>
            <div className="v">{pct != null ? `${pct.toFixed(0)}%` : '—'}</div>
          </div>
          <div className="edge-box">
            <div className="k">Market implied</div>
            <div className="v">{p.marketImpliedPct.toFixed(0)}%</div>
          </div>
          <div className="edge-box">
            <div className="k">Edge</div>
            <div className={`v ${p.edgePct != null && p.edgePct >= 0 ? 'pos' : 'neg'}`}>
              {p.edgePct != null ? `${p.edgePct >= 0 ? '+' : ''}${p.edgePct.toFixed(0)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      <ul className="rationale">
        {p.rationale.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
