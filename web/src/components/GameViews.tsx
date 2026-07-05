import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { EspnEvent, EspnCompetitor, Prediction } from '../espn';

// --- Countdown (future games) -----------------------------------------------

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
    done: diff === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Pre-game "kickoff" card: matchup, a live countdown, and the model's split. */
export function KickoffCard({ event, prediction }: { event: EspnEvent; prediction?: Prediction }) {
  const away = event.competitors.find((c) => c.homeAway === 'away');
  const home = event.competitors.find((c) => c.homeAway === 'home');
  const { d, h, m, s } = useCountdown(event.date);

  // Model split (both sides) from the single-sided prediction.
  let homePct: number | null = null;
  if (prediction?.researchWinPct != null && home) {
    const sideIsHome = prediction.side === home.name;
    homePct = sideIsHome ? prediction.researchWinPct : 100 - prediction.researchWinPct;
  }

  const kickoff = new Date(event.date).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <motion.div className="kickoff" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}>
      <div className="ko-matchup">
        <TeamBadge c={away} />
        <div className="ko-vs">
          <span>VS</span>
        </div>
        <TeamBadge c={home} home />
      </div>

      <div className="ko-when">{kickoff}</div>

      <div className="count">
        {[
          { v: d, l: 'days' },
          { v: h, l: 'hrs' },
          { v: m, l: 'min' },
          { v: s, l: 'sec' },
        ].map((b) => (
          <div className="box" key={b.l}>
            <div className="num">{pad(b.v)}</div>
            <div className="lab">{b.l}</div>
          </div>
        ))}
      </div>

      {homePct != null && away && home && (
        <div className="split">
          <div className="split-labels">
            <span>{away.abbreviation} {(100 - homePct).toFixed(0)}%</span>
            <span>{home.abbreviation} {homePct.toFixed(0)}%</span>
          </div>
          <div className="split-bar">
            <motion.div className="split-away" initial={{ width: 0 }} animate={{ width: `${100 - homePct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
            <motion.div className="split-home" initial={{ width: 0 }} animate={{ width: `${homePct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TeamBadge({ c, home }: { c?: EspnCompetitor; home?: boolean }) {
  return (
    <div className="ko-team">
      <div className="ko-abbr">{c?.abbreviation ?? '—'}</div>
      <div className="ko-rec">{c?.record ?? (home ? 'home' : 'away')}</div>
    </div>
  );
}

// --- Win-probability chart (live / final) -----------------------------------

export function WinProbChart({
  timeline,
  homeAbbr,
  awayAbbr,
}: {
  timeline: number[];
  homeAbbr: string;
  awayAbbr: string;
}) {
  const W = 100;
  const H = 42;
  const n = timeline.length;
  const pts = timeline.map((p, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - (p / 100) * H; // higher home % → higher on chart
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = pts.join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const current = timeline[n - 1] ?? 50;

  return (
    <div className="card">
      <div className="row" style={{ paddingTop: 0 }}>
        <span className="k">Win probability</span>
        <span className="v" style={{ fontSize: 13 }}>
          {homeAbbr} {current.toFixed(0)}%
        </span>
      </div>
      <svg className="wp-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="wpfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--border-strong)" strokeWidth="0.4" strokeDasharray="2 2" />
        <polygon points={area} fill="url(#wpfill)" />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.2"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="wp-axis">
        <span>{awayAbbr}</span>
        <span>{homeAbbr}</span>
      </div>
    </div>
  );
}

// --- Linescore table (per-period scoring) -----------------------------------

export function LinescoreTable({ event }: { event: EspnEvent }) {
  const away = event.competitors.find((c) => c.homeAway === 'away');
  const home = event.competitors.find((c) => c.homeAway === 'home');
  const periods = Math.max(away?.linescores.length ?? 0, home?.linescores.length ?? 0);
  if (periods === 0) return null;
  const cols = Array.from({ length: periods }, (_, i) => i + 1);

  const row = (c?: EspnCompetitor) => (
    <tr>
      <td className="team">{c?.abbreviation ?? '—'}</td>
      {cols.map((_, i) => (
        <td key={i}>{c?.linescores[i] ?? '·'}</td>
      ))}
      <td className="total">{c?.score ?? '·'}</td>
    </tr>
  );

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="linescore">
        <thead>
          <tr>
            <th></th>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th className="total">T</th>
          </tr>
        </thead>
        <tbody>
          {row(away)}
          {row(home)}
        </tbody>
      </table>
    </div>
  );
}
