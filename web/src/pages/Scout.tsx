import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEAGUES, scoutLeague, type ScoutPick } from '../espn';
import { americanOdds, pct } from '../stats';
import { type BetDraft, emptyDraft, americanToDecimal, decimalToAmerican } from '../betDraft';
import { ScoutIcon } from '../components/icons';

// A focused set of leagues worth scouting.
const SCOUT_LEAGUES = LEAGUES.filter((l) =>
  ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'wnba', 'epl', 'ucl', 'wc'].includes(l.id),
);

function confidenceOf(pct: number): 'high' | 'medium' | 'low' {
  return pct >= 68 ? 'high' : pct >= 58 ? 'medium' : 'low';
}

/** A single lock → a trackable single moneyline draft. */
function pickToDraft(p: ScoutPick): BetDraft {
  const d = emptyDraft('manual');
  d.book = 'other';
  d.betType = 'single';
  d.status = 'open';
  d.league = p.league;
  d.oddsAmerican = p.marketOdds ?? p.fairOdds;
  d.legs = [
    {
      selection: p.favName,
      market: 'Moneyline',
      event: p.matchup.replace('@', 'v'),
      oddsAmerican: d.oddsAmerican,
      result: null,
    },
  ];
  return d;
}

/** Top locks → one parlay draft with combined odds. */
function locksToParlay(picks: ScoutPick[]): BetDraft {
  const legs = picks.slice(0, 3);
  const d = emptyDraft('manual');
  d.book = 'other';
  d.betType = 'parlay';
  d.status = 'open';
  d.league = legs[0]?.league ?? null;
  d.legs = legs.map((p) => ({
    selection: p.favName,
    market: 'Moneyline',
    event: p.matchup.replace('@', 'v'),
    oddsAmerican: p.marketOdds ?? p.fairOdds,
    result: null,
  }));
  const dec = legs.reduce((acc, p) => acc * americanToDecimal(p.marketOdds ?? p.fairOdds ?? 100), 1);
  d.oddsAmerican = decimalToAmerican(dec);
  return d;
}

export function Scout({ onTrack }: { onTrack: (draft: BetDraft) => void }) {
  const [league, setLeague] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [picks, setPicks] = useState<ScoutPick[] | null>(null);
  const [error, setError] = useState('');

  const run = async (id: string) => {
    setLeague(id);
    setLoading(true);
    setError('');
    setPicks(null);
    try {
      const res = await scoutLeague(id, { maxGames: 12 });
      setPicks(res);
      if (res.length === 0) setError('No upcoming games with projections for this league right now.');
    } catch {
      setError('Could not reach ESPN. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const top = picks?.[0];
  const bestValue = picks
    ?.filter((p) => p.edgePct != null && p.edgePct > 0)
    .sort((a, b) => (b.edgePct ?? 0) - (a.edgePct ?? 0))[0];
  const parlayLegs = picks?.filter((p) => p.favWinPct >= 60).slice(0, 3) ?? [];

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="brand-row">
          <span style={{ color: 'var(--accent)', display: 'flex' }}>
            <ScoutIcon active />
          </span>
          <h1 className="screen-title">Scout</h1>
        </div>
      </div>
      <p className="screen-sub" style={{ marginTop: -8, marginBottom: 14 }}>
        Pick a sport — Scout ranks today's games by win probability and flags the locks.
      </p>

      <div className="chip-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
        {SCOUT_LEAGUES.map((l) => (
          <motion.button
            key={l.id}
            className={`chip ${league === l.id ? 'active' : ''}`}
            onClick={() => run(l.id)}
            whileTap={{ scale: 0.93 }}
          >
            {l.label}
          </motion.button>
        ))}
      </div>

      {loading && (
        <div className="ocr-status">
          <div className="scan-ring" style={{ width: 46, height: 46, margin: '0 auto' }} />
          <p className="screen-sub" style={{ marginTop: 14 }}>Reading the board on ESPN…</p>
        </div>
      )}

      {!loading && error && <div className="note" style={{ marginTop: 16 }}>{error}</div>}

      <AnimatePresence>
        {!loading && picks && picks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {top && (
              <>
                <div className="section-head"><h2>Top lock</h2></div>
                <TopLock pick={top} onTrack={() => onTrack(pickToDraft(top))} />
              </>
            )}

            {bestValue && bestValue !== top && (
              <>
                <div className="section-head"><h2>Best value</h2></div>
                <LockRow pick={bestValue} highlight onTrack={() => onTrack(pickToDraft(bestValue))} />
                <p className="screen-sub" style={{ marginTop: 6 }}>
                  Model likes {bestValue.favAbbr} more than the price — {`+${bestValue.edgePct!.toFixed(0)}%`} edge.
                </p>
              </>
            )}

            {parlayLegs.length >= 2 && (
              <>
                <div className="section-head"><h2>Lock parlay</h2></div>
                <ParlayCard legs={parlayLegs} onTrack={() => onTrack(locksToParlay(parlayLegs))} />
              </>
            )}

            {picks.length > 1 && (
              <>
                <div className="section-head"><h2>All games, ranked</h2></div>
                {picks.map((p) => (
                  <LockRow key={p.eventId} pick={p} onTrack={() => onTrack(pickToDraft(p))} />
                ))}
              </>
            )}

            <p className="note" style={{ marginTop: 14 }}>
              Estimates from ESPN's model / market lines — research, not betting advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopLock({ pick, onTrack }: { pick: ScoutPick; onTrack: () => void }) {
  const conf = confidenceOf(pick.favWinPct);
  const odds = pick.marketOdds ?? pick.fairOdds;
  return (
    <div className="predict" style={{ marginTop: 4 }}>
      <div className="predict-head">
        <span className="title">{pick.favName}</span>
        <span className={`conf ${conf}`}>{conf} lock</span>
      </div>
      <div className="gauge">
        <span className="big">{pick.favWinPct.toFixed(0)}%</span>
        <span className="lbl">
          to beat {pick.oppAbbr}
          <br />
          <b style={{ color: 'var(--text)' }}>{pick.matchup}</b>
        </span>
      </div>
      <div className="meter">
        <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${pick.favWinPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
      </div>
      <div className="edge-row">
        <div className="edge-box">
          <div className="k">Win prob</div>
          <div className="v">{pick.favWinPct.toFixed(0)}%</div>
        </div>
        {odds != null && (
          <div className="edge-box">
            <div className="k">Moneyline</div>
            <div className="v">{americanOdds(odds)}</div>
          </div>
        )}
        {pick.edgePct != null && (
          <div className="edge-box">
            <div className="k">Edge</div>
            <div className={`v ${pick.edgePct >= 0 ? 'pos' : 'neg'}`}>
              {pick.edgePct >= 0 ? '+' : ''}{pick.edgePct.toFixed(0)}%
            </div>
          </div>
        )}
      </div>
      <p className="screen-sub" style={{ margin: '2px 0 12px' }}>
        Recommended: back <b style={{ color: 'var(--text)' }}>{pick.favName}</b> moneyline
        {odds != null ? ` at ${americanOdds(odds)}` : ''}.
      </p>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={onTrack}>
        Track this bet
      </motion.button>
    </div>
  );
}

function LockRow({ pick, onTrack, highlight }: { pick: ScoutPick; onTrack: () => void; highlight?: boolean }) {
  const conf = confidenceOf(pick.favWinPct);
  return (
    <div className="book-row" style={highlight ? { borderColor: 'var(--accent)' } : undefined}>
      <span className={`status-pill ${conf === 'high' ? 'win' : conf === 'medium' ? 'push' : 'open'}`}
        style={{ marginTop: 0 }}>
        {pick.favWinPct.toFixed(0)}%
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="name">{pick.favName}</div>
        <div className="sub">{pick.matchup} · {americanOdds(pick.marketOdds ?? pick.fairOdds)}</div>
      </div>
      <div className="right">
        <button className="link" onClick={onTrack}>Track</button>
      </div>
    </div>
  );
}

function ParlayCard({ legs, onTrack }: { legs: ScoutPick[]; onTrack: () => void }) {
  const dec = legs.reduce((acc, p) => acc * americanToDecimal(p.marketOdds ?? p.fairOdds ?? 100), 1);
  const combinedProb = legs.reduce((acc, p) => acc * (p.favWinPct / 100), 1);
  return (
    <div className="card">
      {legs.map((p) => (
        <div className="row" key={p.eventId}>
          <span className="k">{p.favName}</span>
          <span className="v">{p.favWinPct.toFixed(0)}% · {americanOdds(p.marketOdds ?? p.fairOdds)}</span>
        </div>
      ))}
      <div className="row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 10 }}>
        <span className="k">{legs.length}-leg parlay</span>
        <span className="v">{americanOdds(decimalToAmerican(dec))} · {pct(combinedProb)} to hit</span>
      </div>
      <motion.button className="btn secondary" style={{ marginTop: 12 }} whileTap={{ scale: 0.97 }} onClick={onTrack}>
        Track parlay
      </motion.button>
    </div>
  );
}
