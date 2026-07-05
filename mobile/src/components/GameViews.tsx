import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Polygon, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import type { EspnEvent, EspnCompetitor, Prediction } from '../lib/espn';
import { colors, radius, accentGradient } from '../theme';

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
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Pre-game "kickoff" card: matchup, a live countdown, and the model's split. */
export function KickoffCard({ event, prediction }: { event: EspnEvent; prediction?: Prediction }) {
  const away = event.competitors.find((c) => c.homeAway === 'away');
  const home = event.competitors.find((c) => c.homeAway === 'home');
  const { d, h, m, s } = useCountdown(event.date);

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
    <LinearGradient colors={[colors.surface2, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.kickoff}>
      <View style={styles.koMatchup}>
        <TeamBadge c={away} />
        <Text style={styles.koVs}>VS</Text>
        <TeamBadge c={home} home />
      </View>

      <Text style={styles.koWhen}>{kickoff}</Text>

      <View style={styles.count}>
        {[
          { v: d, l: 'days' },
          { v: h, l: 'hrs' },
          { v: m, l: 'min' },
          { v: s, l: 'sec' },
        ].map((b) => (
          <View style={styles.countBox} key={b.l}>
            <Text style={styles.countNum}>{pad(b.v)}</Text>
            <Text style={styles.countLab}>{b.l}</Text>
          </View>
        ))}
      </View>

      {homePct != null && away && home && (
        <View style={{ marginTop: 16 }}>
          <View style={styles.splitLabels}>
            <Text style={styles.splitLabel}>{away.abbreviation} {(100 - homePct).toFixed(0)}%</Text>
            <Text style={styles.splitLabel}>{home.abbreviation} {homePct.toFixed(0)}%</Text>
          </View>
          <View style={styles.splitBar}>
            <View style={{ width: `${100 - homePct}%`, backgroundColor: colors.faint }} />
            <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${homePct}%` }} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function TeamBadge({ c, home }: { c?: EspnCompetitor; home?: boolean }) {
  return (
    <View style={styles.koTeam}>
      <Text style={styles.koAbbr}>{c?.abbreviation ?? '—'}</Text>
      <Text style={styles.koRec}>{c?.record ?? (home ? 'home' : 'away')}</Text>
    </View>
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
    const y = H - (p / 100) * H;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = pts.join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const current = timeline[n - 1] ?? 50;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardK}>Win probability</Text>
        <Text style={styles.cardV}>
          {homeAbbr} {current.toFixed(0)}%
        </Text>
      </View>
      <Svg width="100%" height={64} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginVertical: 6 }}>
        <Defs>
          <SvgGradient id="wpfill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={colors.borderStrong} strokeWidth="0.4" strokeDasharray="2 2" />
        <Polygon points={area} fill="url(#wpfill)" />
        <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth="1.2" strokeLinejoin="round" />
      </Svg>
      <View style={styles.rowBetween}>
        <Text style={styles.wpAxis}>{awayAbbr}</Text>
        <Text style={styles.wpAxis}>{homeAbbr}</Text>
      </View>
    </View>
  );
}

// --- Linescore table (per-period scoring) -----------------------------------

export function LinescoreTable({ event }: { event: EspnEvent }) {
  const away = event.competitors.find((c) => c.homeAway === 'away');
  const home = event.competitors.find((c) => c.homeAway === 'home');
  const periods = Math.max(away?.linescores.length ?? 0, home?.linescores.length ?? 0);
  if (periods === 0) return null;
  const cols = Array.from({ length: periods }, (_, i) => i + 1);

  const Row = ({ c }: { c?: EspnCompetitor }) => (
    <View style={styles.lsRow}>
      <Text style={[styles.lsCell, styles.lsTeam]}>{c?.abbreviation ?? '—'}</Text>
      {cols.map((_, i) => (
        <Text style={styles.lsCell} key={i}>
          {c?.linescores[i] ?? '·'}
        </Text>
      ))}
      <Text style={[styles.lsCell, styles.lsTotal]}>{c?.score ?? '·'}</Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={[styles.lsRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 }]}>
        <Text style={[styles.lsCell, styles.lsHead, styles.lsTeam]} />
        {cols.map((c) => (
          <Text style={[styles.lsCell, styles.lsHead]} key={c}>
            {c}
          </Text>
        ))}
        <Text style={[styles.lsCell, styles.lsHead]}>T</Text>
      </View>
      <Row c={away} />
      <Row c={home} />
    </View>
  );
}

const styles = StyleSheet.create({
  kickoff: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 20, marginBottom: 14 },
  koMatchup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  koTeam: { flex: 1, alignItems: 'center' },
  koAbbr: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  koRec: { color: colors.muted, fontSize: 12, marginTop: 2 },
  koVs: { color: colors.faint, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  koWhen: { textAlign: 'center', color: colors.muted, fontSize: 13, marginVertical: 13 },
  count: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  countBox: {
    flex: 1,
    maxWidth: 74,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  countNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] },
  countLab: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.faint, marginTop: 2 },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  splitLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  splitBar: { flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surface2 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 16,
    marginBottom: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardK: { color: colors.muted, fontSize: 14 },
  cardV: { fontWeight: '700', fontSize: 13, color: colors.text },
  wpAxis: { fontSize: 11, fontWeight: '700', color: colors.faint },

  lsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  lsCell: { flex: 1, textAlign: 'center', fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  lsTeam: { textAlign: 'left', fontWeight: '800', flex: 1.4 },
  lsTotal: { fontWeight: '800' },
  lsHead: { color: colors.faint, fontSize: 11, fontWeight: '700' },
});
