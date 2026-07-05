import { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LEAGUES, scoutLeague, type ScoutPick } from '../lib/espn';
import { americanOdds, pct } from '../lib/stats';
import { type BetDraft, emptyDraft, americanToDecimal, decimalToAmerican } from '../lib/betDraft';
import { colors, radius, accentGradient } from '../theme';
import { ScoutIcon } from '../components/icons';
import { Chip, GradientButton, Note, Pill, SectionHead } from '../components/ui';

const SCOUT_LEAGUES = LEAGUES.filter((l) =>
  ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'wnba', 'epl', 'ucl', 'wc'].includes(l.id),
);

function confidenceOf(p: number): 'high' | 'medium' | 'low' {
  return p >= 68 ? 'high' : p >= 58 ? 'medium' : 'low';
}

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
  const insets = useSafeAreaInsets();
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
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ScoutIcon active color={colors.accent} />
        <Text style={styles.title}>Scout</Text>
      </View>
      <Text style={styles.sub}>
        Pick a sport — Scout ranks today's games by win probability and flags the locks.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {SCOUT_LEAGUES.map((l) => (
          <Chip key={l.id} label={l.label} active={league === l.id} onPress={() => run(l.id)} />
        ))}
      </ScrollView>

      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.sub, { marginTop: 14 }]}>Reading the board on ESPN…</Text>
        </View>
      )}

      {!loading && !!error && <Note>{error}</Note>}

      {!loading && picks && picks.length > 0 && (
        <View>
          {top && (
            <>
              <SectionHead title="Top lock" />
              <TopLock pick={top} onTrack={() => onTrack(pickToDraft(top))} />
            </>
          )}

          {bestValue && bestValue !== top && (
            <>
              <SectionHead title="Best value" />
              <LockRow pick={bestValue} highlight onTrack={() => onTrack(pickToDraft(bestValue))} />
              <Text style={[styles.sub, { marginTop: 6 }]}>
                Model likes {bestValue.favAbbr} more than the price — +{bestValue.edgePct!.toFixed(0)}% edge.
              </Text>
            </>
          )}

          {parlayLegs.length >= 2 && (
            <>
              <SectionHead title="Lock parlay" />
              <ParlayCard legs={parlayLegs} onTrack={() => onTrack(locksToParlay(parlayLegs))} />
            </>
          )}

          {picks.length > 1 && (
            <>
              <SectionHead title="All games, ranked" />
              {picks.map((p) => (
                <LockRow key={p.eventId} pick={p} onTrack={() => onTrack(pickToDraft(p))} />
              ))}
            </>
          )}

          <View style={{ marginTop: 14 }}>
            <Note>Estimates from ESPN's model / market lines — research, not betting advice.</Note>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function TopLock({ pick, onTrack }: { pick: ScoutPick; onTrack: () => void }) {
  const conf = confidenceOf(pick.favWinPct);
  const odds = pick.marketOdds ?? pick.fairOdds;
  return (
    <LinearGradient colors={[colors.surface2, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.predict}>
      <View style={styles.predictHead}>
        <Text style={styles.predictTitle}>{pick.favName}</Text>
        <ConfPill conf={conf} label={`${conf} lock`} />
      </View>
      <View style={styles.gauge}>
        <Text style={styles.gaugeBig}>{pick.favWinPct.toFixed(0)}%</Text>
        <Text style={styles.gaugeLbl}>
          to beat {pick.oppAbbr}
          {'\n'}
          <Text style={{ color: colors.text, fontWeight: '700' }}>{pick.matchup}</Text>
        </Text>
      </View>
      <View style={styles.meter}>
        <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.meterFill, { width: `${pick.favWinPct}%` }]} />
      </View>
      <View style={styles.edgeRow}>
        <EdgeBox k="Win prob" v={`${pick.favWinPct.toFixed(0)}%`} />
        {odds != null && <EdgeBox k="Moneyline" v={americanOdds(odds)} />}
        {pick.edgePct != null && (
          <EdgeBox
            k="Edge"
            v={`${pick.edgePct >= 0 ? '+' : ''}${pick.edgePct.toFixed(0)}%`}
            color={pick.edgePct >= 0 ? colors.pos : colors.neg}
          />
        )}
      </View>
      <Text style={[styles.sub, { marginTop: 2, marginBottom: 12 }]}>
        Recommended: back <Text style={{ color: colors.text, fontWeight: '700' }}>{pick.favName}</Text> moneyline
        {odds != null ? ` at ${americanOdds(odds)}` : ''}.
      </Text>
      <GradientButton label="Track this bet" onPress={onTrack} />
    </LinearGradient>
  );
}

function LockRow({ pick, onTrack, highlight }: { pick: ScoutPick; onTrack: () => void; highlight?: boolean }) {
  const conf = confidenceOf(pick.favWinPct);
  const kind = conf === 'high' ? 'win' : conf === 'medium' ? 'push' : 'open';
  return (
    <View style={[styles.lockRow, highlight && { borderColor: colors.accent }]}>
      <Pill kind={kind} label={`${pick.favWinPct.toFixed(0)}%`} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
        <Text style={styles.lockName}>{pick.favName}</Text>
        <Text style={styles.lockSub}>
          {pick.matchup} · {americanOdds(pick.marketOdds ?? pick.fairOdds)}
        </Text>
      </View>
      <Text style={styles.link} onPress={onTrack}>
        Track
      </Text>
    </View>
  );
}

function ParlayCard({ legs, onTrack }: { legs: ScoutPick[]; onTrack: () => void }) {
  const dec = legs.reduce((acc, p) => acc * americanToDecimal(p.marketOdds ?? p.fairOdds ?? 100), 1);
  const combinedProb = legs.reduce((acc, p) => acc * (p.favWinPct / 100), 1);
  return (
    <View style={styles.card}>
      {legs.map((p) => (
        <View style={styles.parlayRow} key={p.eventId}>
          <Text style={styles.parlayK}>{p.favName}</Text>
          <Text style={styles.parlayV}>
            {p.favWinPct.toFixed(0)}% · {americanOdds(p.marketOdds ?? p.fairOdds)}
          </Text>
        </View>
      ))}
      <View style={[styles.parlayRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 10 }]}>
        <Text style={styles.parlayK}>{legs.length}-leg parlay</Text>
        <Text style={styles.parlayV}>
          {americanOdds(decimalToAmerican(dec))} · {pct(combinedProb)} to hit
        </Text>
      </View>
      <GradientButton label="Track parlay" variant="secondary" onPress={onTrack} style={{ marginTop: 12 }} />
    </View>
  );
}

function ConfPill({ conf, label }: { conf: 'high' | 'medium' | 'low'; label: string }) {
  const map = {
    high: { bg: 'rgba(52,211,153,0.18)', fg: colors.pos },
    medium: { bg: 'rgba(240,184,73,0.18)', fg: colors.push },
    low: { bg: colors.surface2, fg: colors.muted },
  }[conf];
  return (
    <View style={[styles.confPill, { backgroundColor: map.bg }]}>
      <Text style={[styles.confText, { color: map.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function EdgeBox({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <View style={styles.edgeBox}>
      <Text style={styles.edgeK}>{k}</Text>
      <Text style={[styles.edgeV, color ? { color } : null]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  sub: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 10 },
  chipRow: { gap: 8, paddingVertical: 4 },

  predict: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  predictHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  predictTitle: { fontWeight: '800', fontSize: 15, color: colors.text, flex: 1 },
  confPill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  confText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  gauge: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  gaugeBig: { fontSize: 38, fontWeight: '800', letterSpacing: -1, color: colors.text },
  gaugeLbl: { color: colors.muted, fontSize: 13, flex: 1 },
  meter: { height: 10, borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  meterFill: { height: '100%', borderRadius: 999 },

  edgeRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  edgeBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  edgeK: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  edgeV: { fontSize: 18, fontWeight: '800', marginTop: 3, color: colors.text },

  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  lockName: { fontWeight: '700', fontSize: 15, color: colors.text },
  lockSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 16,
    marginBottom: 12,
  },
  parlayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  parlayK: { color: colors.muted, fontSize: 14 },
  parlayV: { fontWeight: '700', color: colors.text },
});
